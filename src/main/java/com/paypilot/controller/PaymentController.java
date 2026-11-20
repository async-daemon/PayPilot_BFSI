package com.paypilot.controller;

import com.paypilot.security.AuthInterceptor;
import com.paypilot.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    private String userId(HttpServletRequest request) {
        return (String) request.getAttribute(AuthInterceptor.USER_ID_ATTR);
    }

    @GetMapping("/progress")
    public Map<String, Object> progress(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String search,
        HttpServletRequest request
    ) {
        return Map.of("bills", paymentService.paymentProgress(userId(request), category, search));
    }

    @GetMapping("/overview")
    public Map<String, Object> overview(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) LocalDate fromDate,
        @RequestParam(required = false) LocalDate toDate,
        HttpServletRequest request
    ) {
        return Map.of("bills", paymentService.paymentOverview(userId(request), category, fromDate, toDate));
    }

    @GetMapping("/history")
    public Map<String, Object> history(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) LocalDate fromDate,
        @RequestParam(required = false) LocalDate toDate,
        HttpServletRequest request
    ) {
        return Map.of("payments", paymentService.paymentHistory(userId(request), category, fromDate, toDate));
    }
}
