package com.paypilot.service;

import com.paypilot.dto.ReminderView;
import com.paypilot.dto.Requests.ReminderRequest;
import com.paypilot.model.Constants;
import com.paypilot.model.ReminderSettings;
import com.paypilot.repository.ReminderRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final BillService billService;

    public ReminderService(ReminderRepository reminderRepository, BillService billService) {
        this.reminderRepository = reminderRepository;
        this.billService = billService;
    }

    public Map<String, Object> upsertReminder(String userId, String billId, ReminderRequest req) {
        billService.getOwnedBill(userId, billId);
        if (req.getReminderFrequency() != null && !Constants.REMINDER_FREQUENCIES.contains(req.getReminderFrequency())) {
            throw ApiException.badRequest("Invalid reminder frequency.");
        }
        ReminderSettings existing = reminderRepository.findByBillId(billId).orElse(null);
        ReminderSettings reminder = existing != null ? existing : new ReminderSettings();
        if (existing == null) {
            reminder.setReminderId(UUID.randomUUID().toString());
            reminder.setBillId(billId);
        }
        reminder.setReminderFrequency(req.getReminderFrequency() != null ? req.getReminderFrequency() : (existing != null ? existing.getReminderFrequency() : "Weekly"));
        reminder.setReminderStartDate(req.getReminderStartDate() != null ? req.getReminderStartDate() : (existing != null ? existing.getReminderStartDate() : null));
        reminder.setCustomMessage(req.getCustomMessage() != null ? req.getCustomMessage() : (existing != null ? existing.getCustomMessage() : null));
        reminder.setNotificationPreference(req.getNotificationPreference() != null ? req.getNotificationPreference() : (existing != null ? existing.getNotificationPreference() : "Email"));
        reminder.setRecurring(Boolean.TRUE.equals(req.getIsRecurring()));
        reminderRepository.save(reminder);
        return Map.of("ok", true, "message", "Reminder settings updated!!", "reminder", new ReminderView(reminder));
    }

    public ReminderView getReminder(String userId, String billId) {
        billService.getOwnedBill(userId, billId);
        return reminderRepository.findByBillId(billId).map(ReminderView::new).orElse(null);
    }
}
