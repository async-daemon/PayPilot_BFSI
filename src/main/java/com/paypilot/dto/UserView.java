package com.paypilot.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.paypilot.model.User;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class UserView {
    private final String userId;
    private final String email;
    private final String panDetails;
    private final String bankAccountNumber;
    private final String ifscCode;
    private final String bankingPartner;
    private final Boolean isAdmin;
    private final String status;
    private final int failedAttempts;
    private final boolean locked;
    private final LocalDateTime createdAt;

    public UserView(User u) {
        this.userId = u.getUserId();
        this.email = u.getEmail();
        this.panDetails = u.getPanDetails();
        this.bankAccountNumber = u.getBankAccountNumber();
        this.ifscCode = u.getIfscCode();
        this.bankingPartner = u.getBankingPartner();
        this.isAdmin = u.isAdmin();
        this.status = u.getStatus();
        this.failedAttempts = u.getFailedAttempts();
        this.locked = u.isLocked();
        this.createdAt = u.getCreatedAt();
    }
}
