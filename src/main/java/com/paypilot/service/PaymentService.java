package com.paypilot.service;

import com.paypilot.dto.PaymentView;
import com.paypilot.model.Bill;
import com.paypilot.model.Constants;
import com.paypilot.repository.BillRepository;
import com.paypilot.repository.PaymentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    private final BillRepository billRepository;
    private final PaymentRepository paymentRepository;

    public PaymentService(BillRepository billRepository, PaymentRepository paymentRepository) {
        this.billRepository = billRepository;
        this.paymentRepository = paymentRepository;
    }

    public List<Map<String, Object>> paymentProgress(String userId, String category, String search) {
        String cat = (category == null || category.equals("All")) ? null : category;
        List<Bill> bills = billRepository.search(userId, cat, null, null, null, search);
        return bills.stream().map(bill -> {
            double paid = paymentRepository.totalPaidForBill(bill.getBillId());
            int percent = bill.getAmount() > 0 ? (int) Math.min(100, Math.round((paid / bill.getAmount()) * 100)) : 0;
            String color = "red";
            if (Constants.STATUS_PAID.equals(bill.getPaymentStatus())) color = "green";
            else if (percent > 0) color = "blue";

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bill_id", bill.getBillId());
            row.put("bill_name", bill.getBillName());
            row.put("bill_category", bill.getBillCategory());
            row.put("due_date", bill.getDueDate());
            row.put("amount", bill.getAmount());
            row.put("amount_paid", paid);
            row.put("progress_percent", percent);
            row.put("progress_color", color);
            return row;
        }).toList();
    }

    public List<Map<String, Object>> paymentOverview(String userId, String category, LocalDate fromDate, LocalDate toDate) {
        String cat = (category == null || category.equals("All")) ? null : category;
        List<Bill> bills = billRepository.search(userId, cat, fromDate, toDate, null, null);
        LocalDate today = LocalDate.now();
        return bills.stream().map(bill -> {
            String status = Constants.STATUS_PAID.equals(bill.getPaymentStatus())
                ? "Paid"
                : (!bill.getDueDate().isBefore(today) ? "Due soon" : "Overdue");
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bill_id", bill.getBillId());
            row.put("bill_name", bill.getBillName());
            row.put("bill_category", bill.getBillCategory());
            row.put("due_date", bill.getDueDate());
            row.put("amount", bill.getAmount());
            row.put("payment_status", status);
            return row;
        }).toList();
    }

    public List<PaymentView> paymentHistory(String userId, String category, LocalDate fromDate, LocalDate toDate) {
        String cat = (category == null || category.equals("All")) ? null : category;
        return paymentRepository.listForUser(userId, cat, fromDate, toDate);
    }
}
