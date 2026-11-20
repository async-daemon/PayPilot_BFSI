package com.paypilot.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public class Requests {

    @Data
    public static class SignupRequest {
        private String email;
        private String userId;
        private String panDetails;
        private String bankAccountNumber;
        private String ifscCode;
        private String bankingPartner;
        private String password;
        private String confirmPassword;
    }

    @Data
    public static class ScreenChallengeRequest {
        private String userId;
    }

    @Data
    public static class VerifyScreenRequest {
        private String userId;
        private List<Integer> answer;
    }

    @Data
    public static class VerifyOtpRequest {
        private String userId;
        private String otp;
    }

    @Data
    public static class LoginRequest {
        private String userId;
        private String password;
    }

    @Data
    public static class ForgotRequestRequest {
        private String userId;
        private String email;
    }

    @Data
    public static class ForgotVerifyRequest {
        private String userId;
        private String otp;
    }

    @Data
    public static class ForgotResetRequest {
        private String userId;
        private String newPassword;
        private String confirmPassword;
    }

    @Data
    public static class AddBillRequest {
        private String billName;
        private String billCategory;
        // Explicit ISO format: bound from a multipart form field (plain string,
        // no Jackson involved), and Spring 5/Boot 2's default WebConversionService
        // doesn't reliably parse java.time.LocalDate from a form field without it.
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate dueDate;
        private Double amount;
        private String reminderFrequency;
        private String notes;
        private Boolean isRecurring;
        private String loanType;
        private Double totalLoanAmount;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate periodFrom;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate periodTo;
        private MultipartFile attachment;
    }

    @Data
    public static class EditBillRequest {
        private String billName;
        private String billCategory;
        private LocalDate dueDate;
        private Double amount;
        private String reminderFrequency;
        private String notes;
        private Boolean isRecurring;
        private String loanType;
        private Double totalLoanAmount;
        private LocalDate periodFrom;
        private LocalDate periodTo;
    }

    @Data
    public static class ReminderRequest {
        private String reminderFrequency;
        private LocalDate reminderStartDate;
        private String customMessage;
        private String notificationPreference;
        private Boolean isRecurring;
    }

    @Data
    public static class ScheduleRequest {
        private String payeeName;
        private String payeeAddress;
        private String payeeBankDetails;
        private String paymentMode;
        private String paymentFrequency;
        private String payerAccountNumber;
        private String purposeOfPayment;
        private LocalDate scheduledDate;
        private Double amount;
    }

    @Data
    public static class ModifyScheduleRequest {
        private LocalDate scheduledDate;
    }

    @Data
    public static class PayNowRequest {
        private Double amount;
        private String paymentMode;
        private String payerAccountNumber;
        private String paymentInstitution;
        private String cardHolderName;
        private String cardLast4;
    }

    @Data
    public static class SnoozeRequest {
        private LocalDate untilDate;
    }

    @Data
    public static class MarkPaidRequest {
        private String paymentMode;
        private String payerAccountNumber;
    }
}
