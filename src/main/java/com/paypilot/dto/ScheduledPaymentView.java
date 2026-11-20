package com.paypilot.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ScheduledPaymentView {
    private final String scheduledPaymentId;
    private final String billId;
    private final String payeeName;
    private final String payeeAddress;
    private final String payeeBankDetails;
    private final String paymentFrequency;
    private final String paymentMode;
    private final String payerAccountNumber;
    private final String purposeOfPayment;
    private final LocalDate scheduledDate;
    private final double amount;
    private final String status;
    private final LocalDateTime createdAt;
    private final String billName;
    private final String billCategory;
    private final LocalDate dueDate;

    public ScheduledPaymentView(String scheduledPaymentId, String billId, String payeeName, String payeeAddress,
                                 String payeeBankDetails, String paymentFrequency, String paymentMode,
                                 String payerAccountNumber, String purposeOfPayment, LocalDate scheduledDate,
                                 double amount, String status, LocalDateTime createdAt,
                                 String billName, String billCategory, LocalDate dueDate) {
        this.scheduledPaymentId = scheduledPaymentId;
        this.billId = billId;
        this.payeeName = payeeName;
        this.payeeAddress = payeeAddress;
        this.payeeBankDetails = payeeBankDetails;
        this.paymentFrequency = paymentFrequency;
        this.paymentMode = paymentMode;
        this.payerAccountNumber = payerAccountNumber;
        this.purposeOfPayment = purposeOfPayment;
        this.scheduledDate = scheduledDate;
        this.amount = amount;
        this.status = status;
        this.createdAt = createdAt;
        this.billName = billName;
        this.billCategory = billCategory;
        this.dueDate = dueDate;
    }
}
