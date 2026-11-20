package com.paypilot.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class PaymentView {
    private final String paymentId;
    private final String billId;
    private final LocalDate paymentDate;
    private final String paymentMode;
    private final String payerAccountNumber;
    private final String paymentInstitution;
    private final String cardHolderName;
    private final String cardLast4;
    private final double amountPaid;
    private final String status;
    private final String billName;
    private final String billCategory;
    private final LocalDate dueDate;

    public PaymentView(String paymentId, String billId, LocalDate paymentDate, String paymentMode,
                        String payerAccountNumber, String paymentInstitution, String cardHolderName,
                        String cardLast4, double amountPaid, String status,
                        String billName, String billCategory, LocalDate dueDate) {
        this.paymentId = paymentId;
        this.billId = billId;
        this.paymentDate = paymentDate;
        this.paymentMode = paymentMode;
        this.payerAccountNumber = payerAccountNumber;
        this.paymentInstitution = paymentInstitution;
        this.cardHolderName = cardHolderName;
        this.cardLast4 = cardLast4;
        this.amountPaid = amountPaid;
        this.status = status;
        this.billName = billName;
        this.billCategory = billCategory;
        this.dueDate = dueDate;
    }
}
