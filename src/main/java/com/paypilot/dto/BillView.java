package com.paypilot.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.paypilot.model.Bill;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BillView {
    private final String billId;
    private final String userId;
    private final String billName;
    private final String billCategory;
    private final LocalDate dueDate;
    private final double amount;
    private final String reminderFrequency;
    private final String attachment;
    private final String notes;

    private final Boolean isRecurring;
    private final String paymentStatus;
    private final LocalDate snoozedUntil;
    private final String loanType;
    private final Double totalLoanAmount;
    private final LocalDate periodFrom;
    private final LocalDate periodTo;
    private final LocalDateTime createdAt;
    private final int overdueDays;
    private final String dueLabel;
    private final double amountPaid;
    private final double amountDue;

    public BillView(Bill b, double paidSoFar) {
        this.billId = b.getBillId();
        this.userId = b.getUserId();
        this.billName = b.getBillName();
        this.billCategory = b.getBillCategory();
        this.dueDate = b.getDueDate();
        this.amount = b.getAmount();
        this.reminderFrequency = b.getReminderFrequency();
        this.attachment = b.getAttachment();
        this.notes = b.getNotes();
        this.isRecurring = b.isRecurring();
        this.paymentStatus = b.getPaymentStatus();
        this.snoozedUntil = b.getSnoozedUntil();
        this.loanType = b.getLoanType();
        this.totalLoanAmount = b.getTotalLoanAmount();
        this.periodFrom = b.getPeriodFrom();
        this.periodTo = b.getPeriodTo();
        this.createdAt = b.getCreatedAt();

        long daysBetween = ChronoUnit.DAYS.between(b.getDueDate(), LocalDate.now());
        int overdue = (int) daysBetween;
        String label;
        if ("Paid".equals(b.getPaymentStatus())) {
            label = "Paid";
        } else if (overdue > 0) {
            label = "Overdue";
        } else if (overdue >= -3) {
            label = "Due soon";
        } else {
            label = "Due later";
        }
        this.overdueDays = Math.max(overdue, 0);
        this.dueLabel = label;
        this.amountPaid = paidSoFar;
        this.amountDue = Math.max(0, b.getAmount() - paidSoFar);
    }
}
