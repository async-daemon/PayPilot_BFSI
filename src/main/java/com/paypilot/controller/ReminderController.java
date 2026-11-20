package com.paypilot.controller;

import com.paypilot.dto.Requests.ReminderRequest;
import com.paypilot.model.Constants;
import com.paypilot.security.AuthInterceptor;
import com.paypilot.service.ReminderService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;

    public ReminderController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    private String userId(HttpServletRequest request) {
        return (String) request.getAttribute(AuthInterceptor.USER_ID_ATTR);
    }

    @GetMapping("/frequencies")
    public Map<String, Object> frequencies() {
        return Map.of("frequencies", Constants.REMINDER_FREQUENCIES);
    }

    @GetMapping("/{billId}")
    public Map<String, Object> get(@PathVariable String billId, HttpServletRequest request) {
        Object reminder = reminderService.getReminder(userId(request), billId);
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("ok", true);
        result.put("reminder", reminder);
        return result;
    }

    @PutMapping("/{billId}")
    public Map<String, Object> put(@PathVariable String billId, @RequestBody ReminderRequest req, HttpServletRequest request) {
        return reminderService.upsertReminder(userId(request), billId, req);
    }
}
