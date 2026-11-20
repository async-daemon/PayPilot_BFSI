package com.paypilot.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "reminder_settings")
@Getter
@Setter
@NoArgsConstructor
public class ReminderSettings {

    @Id
    @Column(name = "reminder_id")
    private String reminderId;

    @Column(nullable = false, unique = true)
    private String billId;

    @Column(nullable = false)
    private String reminderFrequency;

    private LocalDate reminderStartDate;
    private String customMessage;
    private String notificationPreference;

    @Column(nullable = false)
    private boolean isRecurring = false;
}
