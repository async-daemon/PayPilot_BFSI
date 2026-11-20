package com.paypilot.repository;

import com.paypilot.dto.PaymentView;
import com.paypilot.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    @Query("""
        SELECT new com.paypilot.dto.PaymentView(p.paymentId, p.billId, p.paymentDate, p.paymentMode,
          p.payerAccountNumber, p.paymentInstitution, p.cardHolderName, p.cardLast4, p.amountPaid, p.status,
          b.billName, b.billCategory, b.dueDate)
        FROM Payment p, Bill b
        WHERE p.billId = b.billId AND b.userId = :userId
          AND (:category IS NULL OR b.billCategory = :category)
          AND (:fromDate IS NULL OR p.paymentDate >= :fromDate)
          AND (:toDate IS NULL OR p.paymentDate <= :toDate)
        ORDER BY p.paymentDate DESC
        """)
    List<PaymentView> listForUser(
        @Param("userId") String userId,
        @Param("category") String category,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );

    @Query("SELECT COALESCE(SUM(p.amountPaid), 0) FROM Payment p WHERE p.billId = :billId")
    double totalPaidForBill(@Param("billId") String billId);
}
