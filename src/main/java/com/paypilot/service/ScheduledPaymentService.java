package com.paypilot.service;

import com.paypilot.dto.Requests.ModifyScheduleRequest;
import com.paypilot.dto.Requests.ScheduleRequest;
import com.paypilot.dto.ScheduledPaymentView;
import com.paypilot.model.Bill;
import com.paypilot.model.Constants;
import com.paypilot.model.ScheduledPayment;
import com.paypilot.repository.BillRepository;
import com.paypilot.repository.ScheduledPaymentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ScheduledPaymentService {

    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final BillRepository billRepository;
    private final BillService billService;

    public ScheduledPaymentService(ScheduledPaymentRepository scheduledPaymentRepository, BillRepository billRepository, BillService billService) {
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.billRepository = billRepository;
        this.billService = billService;
    }

    private Bill ownedBillOrScheduledNotFound(String userId, String billId) {
        return billRepository.findByBillIdAndUserId(billId, userId)
            .orElseThrow(() -> ApiException.notFound("Scheduled payment not found."));
    }

    public Map<String, Object> schedulePayment(String userId, String billId, ScheduleRequest req) {
        Bill bill = billService.getOwnedBill(userId, billId);
        if (req.getPayeeName() == null || req.getPayeeName().isBlank() || req.getScheduledDate() == null
            || req.getAmount() == null || req.getPaymentMode() == null) {
            throw ApiException.badRequest("Payee name, payment mode, scheduled date and amount are required.");
        }
        if (!Constants.PAYMENT_METHODS.contains(req.getPaymentMode())) {
            throw ApiException.badRequest("Invalid payment method.");
        }
        if (!bill.isRecurring() && req.getPaymentFrequency() != null) {
            throw ApiException.badRequest("Payment frequency is only available for recurring bills.");
        }

        ScheduledPayment sp = new ScheduledPayment();
        sp.setScheduledPaymentId(UUID.randomUUID().toString());
        sp.setBillId(billId);
        sp.setPayeeName(req.getPayeeName());
        sp.setPayeeAddress(req.getPayeeAddress());
        sp.setPayeeBankDetails(req.getPayeeBankDetails());
        sp.setPaymentFrequency(bill.isRecurring() ? req.getPaymentFrequency() : null);
        sp.setPaymentMode(req.getPaymentMode());
        sp.setPayerAccountNumber(req.getPayerAccountNumber());
        sp.setPurposeOfPayment(req.getPurposeOfPayment());
        sp.setScheduledDate(req.getScheduledDate());
        sp.setAmount(req.getAmount());
        sp.setStatus("Scheduled");
        scheduledPaymentRepository.save(sp);

        return Map.of("ok", true, "message", bill.getBillName() + " scheduled for payment!!", "scheduled", toView(sp, bill));
    }

    public List<ScheduledPaymentView> listScheduled(String userId, String category, LocalDate fromDate, LocalDate toDate) {
        String cat = (category == null || category.equals("All")) ? null : category;
        return scheduledPaymentRepository.listForUser(userId, cat, fromDate, toDate);
    }

    public Map<String, Object> cancel(String userId, String scheduledPaymentId) {
        ScheduledPayment sp = scheduledPaymentRepository.findById(scheduledPaymentId)
            .orElseThrow(() -> ApiException.notFound("Scheduled payment not found."));
        Bill bill = ownedBillOrScheduledNotFound(userId, sp.getBillId());
        if (!"Scheduled".equals(sp.getStatus())) {
            throw ApiException.badRequest("This payment is already " + sp.getStatus().toLowerCase() + ".");
        }
        sp.setStatus("Cancelled");
        scheduledPaymentRepository.save(sp);
        return Map.of("ok", true, "message", "Schedule Payment of " + bill.getBillName() + " Cancelled!", "scheduled", toView(sp, bill));
    }

    public Map<String, Object> modify(String userId, String scheduledPaymentId, ModifyScheduleRequest req) {
        ScheduledPayment sp = scheduledPaymentRepository.findById(scheduledPaymentId)
            .orElseThrow(() -> ApiException.notFound("Scheduled payment not found."));
        Bill bill = ownedBillOrScheduledNotFound(userId, sp.getBillId());
        if (!"Scheduled".equals(sp.getStatus())) {
            throw ApiException.badRequest("This payment is already " + sp.getStatus().toLowerCase() + ".");
        }
        sp.setScheduledDate(req.getScheduledDate());
        scheduledPaymentRepository.save(sp);
        return Map.of("ok", true, "message", "Schedule Payment Date Changed!!", "scheduled", toView(sp, bill));
    }

    private ScheduledPaymentView toView(ScheduledPayment sp, Bill bill) {
        return new ScheduledPaymentView(
            sp.getScheduledPaymentId(), sp.getBillId(), sp.getPayeeName(), sp.getPayeeAddress(),
            sp.getPayeeBankDetails(), sp.getPaymentFrequency(), sp.getPaymentMode(), sp.getPayerAccountNumber(),
            sp.getPurposeOfPayment(), sp.getScheduledDate(), sp.getAmount(), sp.getStatus(), sp.getCreatedAt(),
            bill.getBillName(), bill.getBillCategory(), bill.getDueDate()
        );
    }
}
