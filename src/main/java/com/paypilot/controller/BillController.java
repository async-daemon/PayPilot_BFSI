package com.paypilot.controller;

import com.paypilot.dto.BillView;
import com.paypilot.dto.Requests.*;
import com.paypilot.model.Constants;
import com.paypilot.repository.BillRepository;
import com.paypilot.security.AuthInterceptor;
import com.paypilot.service.BillService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private final BillService billService;

    public BillController(BillService billService) {
        this.billService = billService;
    }

    private String userId(HttpServletRequest request) {
        return (String) request.getAttribute(AuthInterceptor.USER_ID_ATTR);
    }

    @GetMapping("/categories")
    public Map<String, Object> categories() {
        List<String> all = new ArrayList<>();
        all.add("All");
        all.addAll(Constants.BILL_CATEGORIES);
        return Map.of("categories", all);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> add(@ModelAttribute AddBillRequest req, HttpServletRequest request) {
        List<BillView> bills = billService.addBill(userId(request), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true, "message", "Bill successfully added", "bills", bills));
    }

    @PutMapping("/{billId}")
    public Map<String, Object> update(@PathVariable String billId, @RequestBody EditBillRequest req, HttpServletRequest request) {
        return Map.of("ok", true, "bill", billService.updateBill(userId(request), billId, req));
    }

    @DeleteMapping("/{billId}")
    public Map<String, Object> delete(@PathVariable String billId, HttpServletRequest request) {
        billService.deleteBill(userId(request), billId);
        return Map.of("ok", true, "message", "Bill deleted successfully");
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) LocalDate fromDate,
        @RequestParam(required = false) LocalDate toDate,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String search,
        HttpServletRequest request
    ) {
        List<BillView> bills = billService.overview(userId(request), category, fromDate, toDate, status, search);
        List<Map<String, Object>> counts = new ArrayList<>();
        for (BillRepository.CategoryCount c : billService.countByCategory(userId(request))) {
            counts.add(Map.of("bill_category", c.getCategory(), "count", c.getCount()));
        }
        return Map.of("bills", bills, "counts", counts);
    }

    @GetMapping("/upcoming-overdue")
    public Map<String, Object> upcomingOverdue(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String sort,
        HttpServletRequest request
    ) {
        List<BillView> bills = new ArrayList<>(billService.upcomingOverdue(userId(request), category, search));
        if ("overdue_desc".equals(sort)) {
            bills.sort((a, b) -> Integer.compare(b.getOverdueDays(), a.getOverdueDays()));
        }
        return Map.of("bills", bills);
    }

    @GetMapping("/snooze-list")
    public Map<String, Object> snoozeList(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        HttpServletRequest request
    ) {
        return Map.of("bills", billService.snoozeOrMarkPaidList(userId(request), category, search));
    }

    @PostMapping("/{billId}/snooze")
    public Map<String, Object> snooze(@PathVariable String billId, @RequestBody SnoozeRequest req, HttpServletRequest request) {
        BillView bill = billService.snoozeBill(userId(request), billId, req.getUntilDate());
        return Map.of("ok", true, "message", bill.getBillName() + " bill successfully snoozed!", "bill", bill);
    }

    @PostMapping("/{billId}/mark-paid")
    public Map<String, Object> markPaid(@PathVariable String billId, @RequestBody(required = false) MarkPaidRequest req, HttpServletRequest request) {
        BillView bill = billService.markPaid(userId(request), billId, req);
        return Map.of("ok", true, "message", bill.getBillName() + " bill successfully paid!", "bill", bill);
    }

    @PostMapping("/{billId}/pay-now")
    public Map<String, Object> payNow(@PathVariable String billId, @RequestBody PayNowRequest req, HttpServletRequest request) {
        BillView bill = billService.payNow(userId(request), billId, req);
        return Map.of("ok", true, "message", "Payment successful", "bill", bill);
    }
}
