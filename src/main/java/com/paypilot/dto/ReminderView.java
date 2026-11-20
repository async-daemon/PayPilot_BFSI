package com.paypilot.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.paypilot.model.ReminderSettings;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ReminderView {
    private final String reminderId;
    private final String billId;
    private final String reminderFrequency;
    private final LocalDate reminderStartDate;
    private final String customMessage;
    private final String notificationPreference;

    private final Boolean isRecurring;

    public ReminderView(ReminderSettings r) {
        this.reminderId = r.getReminderId();
        this.billId = r.getBillId();
        this.reminderFrequency = r.getReminderFrequency();
        this.reminderStartDate = r.getReminderStartDate();
        this.customMessage = r.getCustomMessage();
        this.notificationPreference = r.getNotificationPreference();
        this.isRecurring = r.isRecurring();
    }
}
