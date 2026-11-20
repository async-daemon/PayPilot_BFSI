package com.paypilot.controller;

import com.paypilot.dto.Requests.ModifyScheduleRequest;
import com.paypilot.dto.Requests.ScheduleRequest;
import com.paypilot.dto.ScheduledPaymentView;
import com.paypilot.model.Constants;
import com.paypilot.security.AuthInterceptor;
import com.paypilot.service.ScheduledPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduled-payments")
public class ScheduledPaymentController {

    private final ScheduledPaymentService scheduledPaymentService;

    public ScheduledPaymentController(ScheduledPaymentService scheduledPaymentService) {
        this.scheduledPaymentService = scheduledPaymentService;
    }

    private String userId(HttpServletRequest request) {
        return (String) request.getAttribute(AuthInterceptor.USER_ID_ATTR);
    }

    @GetMapping("/payment-methods")
    public Map<String, Object> paymentMethods() {
        return Map.of("methods", Constants.PAYMENT_METHODS);
    }

    @GetMapping
    public Map<String, Object> list(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) LocalDate fromDate,
        @RequestParam(required = false) LocalDate toDate,
        HttpServletRequest request
    ) {
        List<ScheduledPaymentView> scheduled = scheduledPaymentService.listScheduled(userId(request), category, fromDate, toDate);
        return Map.of("scheduled", scheduled);
    }

    @PostMapping("/bill/{billId}")
    public ResponseEntity<Map<String, Object>> schedule(@PathVariable String billId, @RequestBody ScheduleRequest req, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduledPaymentService.schedulePayment(userId(request), billId, req));
    }

    @PostMapping("/{scheduledPaymentId}/cancel")
    public Map<String, Object> cancel(@PathVariable String scheduledPaymentId, HttpServletRequest request) {
        return scheduledPaymentService.cancel(userId(request), scheduledPaymentId);
    }

    @PostMapping("/{scheduledPaymentId}/modify")
    public Map<String, Object> modify(@PathVariable String scheduledPaymentId, @RequestBody ModifyScheduleRequest req, HttpServletRequest request) {
        return scheduledPaymentService.modify(userId(request), scheduledPaymentId, req);
    }
}
