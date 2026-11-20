package com.paypilot.repository;

import com.paypilot.dto.ScheduledPaymentView;
import com.paypilot.model.ScheduledPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ScheduledPaymentRepository extends JpaRepository<ScheduledPayment, String> {

    @Query("""
        SELECT new com.paypilot.dto.ScheduledPaymentView(sp.scheduledPaymentId, sp.billId, sp.payeeName,
          sp.payeeAddress, sp.payeeBankDetails, sp.paymentFrequency, sp.paymentMode, sp.payerAccountNumber,
          sp.purposeOfPayment, sp.scheduledDate, sp.amount, sp.status, sp.createdAt,
          b.billName, b.billCategory, b.dueDate)
        FROM ScheduledPayment sp, Bill b
        WHERE sp.billId = b.billId AND b.userId = :userId
          AND (:category IS NULL OR b.billCategory = :category)
          AND (:fromDate IS NULL OR sp.scheduledDate >= :fromDate)
          AND (:toDate IS NULL OR sp.scheduledDate <= :toDate)
        ORDER BY sp.scheduledDate ASC
        """)
    List<ScheduledPaymentView> listForUser(
        @Param("userId") String userId,
        @Param("category") String category,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );
}
