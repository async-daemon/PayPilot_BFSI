package com.paypilot.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bills")
@Getter
@Setter
@NoArgsConstructor
public class Bill {

    @Id
    @Column(name = "bill_id")
    private String billId;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String billName;

    @Column(nullable = false)
    private String billCategory;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false)
    private double amount;

    private String reminderFrequency;
    private String attachment;

    @Column(length = 2000)
    private String notes;

    @Column(nullable = false)
    private boolean isRecurring = false;

    @Column(nullable = false)
    private String paymentStatus = "Not Paid";

    private LocalDate snoozedUntil;

    // Category-specific fields (Debt Payments)
    private String loanType;
    private Double totalLoanAmount;

    // Category-specific fields (House Rent)
    private LocalDate periodFrom;
    private LocalDate periodTo;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
