package com.paypilot.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @Column(name = "payment_id")
    private String paymentId;

    @Column(nullable = false)
    private String billId;

    @Column(nullable = false)
    private LocalDate paymentDate;

    private String paymentMode;
    private String payerAccountNumber;
    private String paymentInstitution;
    private String cardHolderName;
    private String cardLast4;

    @Column(nullable = false)
    private double amountPaid;

    @Column(nullable = false)
    private String status = "Paid";
}
