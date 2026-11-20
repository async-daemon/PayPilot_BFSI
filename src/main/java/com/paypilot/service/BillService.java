package com.paypilot.service;

import com.paypilot.dto.BillView;
import com.paypilot.dto.Requests.*;
import com.paypilot.model.Bill;
import com.paypilot.model.Constants;
import com.paypilot.model.Payment;
import com.paypilot.repository.BillRepository;
import com.paypilot.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BillService {

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;
    private final String uploadsDir;

    public BillService(BillRepository billRepository, PaymentRepository paymentRepository,
                        org.springframework.core.env.Environment env) {
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
        this.uploadsDir = env.getProperty("paypilot.uploads-dir", "./uploads");
    }

    private BillView decorate(Bill b) {
        double paid = paymentRepository.totalPaidForBill(b.getBillId());
        return new BillView(b, paid);
    }

    private Bill findOwned(String billId, String userId) {
        return billRepository.findByBillIdAndUserId(billId, userId)
            .orElseThrow(() -> ApiException.notFound("Bill not found."));
    }

    /** Used by other services (reminders, scheduled payments) to verify bill ownership. */
    public Bill getOwnedBill(String userId, String billId) {
        return findOwned(billId, userId);
    }

    public List<BillView> addBill(String userId, AddBillRequest req) {
        if (!StringUtils.hasText(req.getBillName()) || !StringUtils.hasText(req.getBillCategory())
            || req.getDueDate() == null || req.getAmount() == null) {
            throw ApiException.badRequest("Bill name, category, due date and amount are required.");
        }
        if (!Constants.BILL_CATEGORIES.contains(req.getBillCategory())) {
            throw ApiException.badRequest("Invalid bill category.");
        }

        String attachmentPath = storeAttachment(req.getAttachment());
        boolean recurring = Boolean.TRUE.equals(req.getIsRecurring());
        int occurrences = recurring ? 3 : 1;
        boolean isDebt = "Debt Payments".equals(req.getBillCategory());
        boolean isRent = "House Rent".equals(req.getBillCategory());

        List<BillView> created = new ArrayList<>();
        for (int i = 0; i < occurrences; i++) {
            Bill bill = new Bill();
            bill.setBillId(UUID.randomUUID().toString());
            bill.setUserId(userId);
            bill.setBillName(req.getBillName());
            bill.setBillCategory(req.getBillCategory());
            bill.setDueDate(i == 0 ? req.getDueDate() : req.getDueDate().plusMonths(i));
            bill.setAmount(req.getAmount());
            bill.setReminderFrequency(req.getReminderFrequency());
            bill.setAttachment(attachmentPath);
            bill.setNotes(req.getNotes());
            bill.setRecurring(recurring);
            bill.setPaymentStatus(Constants.STATUS_NOT_PAID);
            bill.setLoanType(isDebt ? req.getLoanType() : null);
            bill.setTotalLoanAmount(isDebt ? req.getTotalLoanAmount() : null);
            bill.setPeriodFrom(isRent && req.getPeriodFrom() != null ? (i == 0 ? req.getPeriodFrom() : req.getPeriodFrom().plusMonths(i)) : null);
            bill.setPeriodTo(isRent && req.getPeriodTo() != null ? (i == 0 ? req.getPeriodTo() : req.getPeriodTo().plusMonths(i)) : null);
            billRepository.save(bill);
            created.add(decorate(bill));
        }
        return created;
    }

    private String storeAttachment(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (!"application/pdf".equals(file.getContentType())) {
            throw ApiException.badRequest("Only PDF attachments are allowed.");
        }
        try {
            Path dir = Paths.get(uploadsDir);
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + ".pdf";
            Path target = dir.resolve(filename);
            file.transferTo(target);
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw ApiException.badRequest("Failed to store attachment.");
        }
    }

    public BillView updateBill(String userId, String billId, EditBillRequest req) {
        Bill existing = findOwned(billId, userId);
        if (req.getBillName() != null) existing.setBillName(req.getBillName());
        if (req.getBillCategory() != null) existing.setBillCategory(req.getBillCategory());
        if (req.getDueDate() != null) existing.setDueDate(req.getDueDate());
        if (req.getAmount() != null) existing.setAmount(req.getAmount());
        if (req.getReminderFrequency() != null) existing.setReminderFrequency(req.getReminderFrequency());
        if (req.getNotes() != null) existing.setNotes(req.getNotes());
        if (req.getIsRecurring() != null) existing.setRecurring(req.getIsRecurring());
        if (req.getLoanType() != null) existing.setLoanType(req.getLoanType());
        if (req.getTotalLoanAmount() != null) existing.setTotalLoanAmount(req.getTotalLoanAmount());
        if (req.getPeriodFrom() != null) existing.setPeriodFrom(req.getPeriodFrom());
        if (req.getPeriodTo() != null) existing.setPeriodTo(req.getPeriodTo());
        billRepository.save(existing);
        return decorate(existing);
    }

    public void deleteBill(String userId, String billId) {
        Bill existing = findOwned(billId, userId);
        billRepository.delete(existing);
    }

    public List<BillView> overview(String userId, String category, LocalDate fromDate, LocalDate toDate, String status, String search) {
        List<Bill> bills = billRepository.search(userId, normalizeCategory(category), fromDate, toDate, blankToNull(status), blankToNull(search));
        return bills.stream().map(this::decorate).collect(Collectors.toList());
    }

    public List<BillRepository.CategoryCount> countByCategory(String userId) {
        return billRepository.countByCategory(userId);
    }

    public List<BillView> upcomingOverdue(String userId, String category, String search) {
        List<Bill> bills = billRepository.search(userId, normalizeCategory(category), null, null, null, blankToNull(search));
        return bills.stream()
            .filter(b -> !Constants.STATUS_PAID.equals(b.getPaymentStatus()))
            .map(this::decorate)
            .collect(Collectors.toList());
    }

    public List<BillView> snoozeOrMarkPaidList(String userId, String category, String search) {
        List<Bill> bills = billRepository.search(userId, normalizeCategory(category), null, null, null, blankToNull(search));
        return bills.stream().map(this::decorate).collect(Collectors.toList());
    }

    /**
     * The frontend's filter dropdowns/search box submit blank strings (not an
     * omitted param) to mean "no filter" -- but only LocalDate-typed params get
     * auto-converted from "" to null by Spring's binder; plain String params
     * (category/status/search) arrive as a literal "", which previously made
     * every "(:param IS NULL OR ...)" clause in BillRepository.search() evaluate
     * to false and silently filtered out every bill. Normalizing here fixes it
     * for every caller.
     */
    private String blankToNull(String s) {
        return (s == null || s.trim().isEmpty()) ? null : s;
    }

    private String normalizeCategory(String category) {
        String c = blankToNull(category);
        return (c == null || c.equals("All")) ? null : c;
    }

    public BillView snoozeBill(String userId, String billId, LocalDate untilDate) {
        Bill bill = findOwned(billId, userId);
        bill.setSnoozedUntil(untilDate);
        billRepository.save(bill);
        return decorate(bill);
    }

    public BillView markPaid(String userId, String billId, MarkPaidRequest req) {
        Bill bill = findOwned(billId, userId);
        double alreadyPaid = paymentRepository.totalPaidForBill(billId);
        double remaining = bill.getAmount() - alreadyPaid;
        if (remaining > 0) {
            Payment payment = new Payment();
            payment.setPaymentId(UUID.randomUUID().toString());
            payment.setBillId(billId);
            payment.setPaymentDate(LocalDate.now());
            payment.setPaymentMode(req != null && req.getPaymentMode() != null ? req.getPaymentMode() : "Manual");
            payment.setPayerAccountNumber(req != null ? req.getPayerAccountNumber() : null);
            payment.setAmountPaid(remaining);
            payment.setStatus("Paid");
            paymentRepository.save(payment);
        }
        bill.setPaymentStatus(Constants.STATUS_PAID);
        billRepository.save(bill);
        return decorate(bill);
    }

    public BillView payNow(String userId, String billId, PayNowRequest req) {
        Bill bill = findOwned(billId, userId);
        if (req.getAmount() == null || req.getAmount() <= 0) {
            throw ApiException.badRequest("A valid amount is required.");
        }
        if (Constants.STATUS_PAID.equals(bill.getPaymentStatus())) {
            throw ApiException.badRequest("This bill is already fully paid.");
        }
        double alreadyPaid = paymentRepository.totalPaidForBill(billId);
        double remaining = bill.getAmount() - alreadyPaid;
        if (req.getAmount() > remaining) {
            throw ApiException.badRequest("Amount exceeds the outstanding balance of ₹" + trim(remaining) + ".");
        }

        Payment payment = new Payment();
        payment.setPaymentId(UUID.randomUUID().toString());
        payment.setBillId(billId);
        payment.setPaymentDate(LocalDate.now());
        payment.setPaymentMode(req.getPaymentMode());
        payment.setPayerAccountNumber(req.getPayerAccountNumber());
        payment.setPaymentInstitution(req.getPaymentInstitution());
        payment.setCardHolderName(req.getCardHolderName());
        payment.setCardLast4(req.getCardLast4());
        payment.setAmountPaid(req.getAmount());
        payment.setStatus("Paid");
        paymentRepository.save(payment);

        double totalPaid = paymentRepository.totalPaidForBill(billId);
        bill.setPaymentStatus(totalPaid >= bill.getAmount() ? Constants.STATUS_PAID : Constants.STATUS_PARTIALLY_PAID);
        billRepository.save(bill);
        return decorate(bill);
    }

    private String trim(double value) {
        if (value == Math.floor(value)) return String.valueOf((long) value);
        return String.valueOf(value);
    }
}
