package com.paypilot.model;

import javax.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String panDetails;
    private String bankAccountNumber;
    private String ifscCode;
    private String bankingPartner;

    @Column(nullable = false)
    private boolean isAdmin = false;

    @Column(nullable = false)
    private String status = "pending";

    @Column(nullable = false)
    private int failedAttempts = 0;

    @Column(nullable = false)
    private boolean locked = false;

    private String resetOtp;
    private Long resetOtpExpires;

    private String loginOtp;
    private Long loginOtpExpires;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
