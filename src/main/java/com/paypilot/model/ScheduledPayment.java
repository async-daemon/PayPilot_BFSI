package com.paypilot.model;

import javax.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "scheduled_payments")
@Getter
@Setter
@NoArgsConstructor
public class ScheduledPayment {

    @Id
    @Column(name = "scheduled_payment_id")
    private String scheduledPaymentId;

    @Column(nullable = false)
    private String billId;

    private String payeeName;
    private String payeeAddress;
    private String payeeBankDetails;
    private String paymentFrequency;
    private String paymentMode;
    private String payerAccountNumber;
    private String purposeOfPayment;

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private String status = "Scheduled";

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
