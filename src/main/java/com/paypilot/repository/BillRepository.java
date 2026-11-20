package com.paypilot.repository;

import com.paypilot.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, String> {

    Optional<Bill> findByBillIdAndUserId(String billId, String userId);

    @Query("""
        SELECT b FROM Bill b
        WHERE b.userId = :userId
          AND (:category IS NULL OR b.billCategory = :category)
          AND (:fromDate IS NULL OR b.dueDate >= :fromDate)
          AND (:toDate IS NULL OR b.dueDate <= :toDate)
          AND (:status IS NULL OR b.paymentStatus = :status)
          AND (:search IS NULL OR LOWER(b.billName) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY b.dueDate ASC
        """)
    List<Bill> search(
        @Param("userId") String userId,
        @Param("category") String category,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        @Param("status") String status,
        @Param("search") String search
    );

    @Query("SELECT b.billCategory AS category, COUNT(b) AS count FROM Bill b WHERE b.userId = :userId GROUP BY b.billCategory")
    List<CategoryCount> countByCategory(@Param("userId") String userId);

    interface CategoryCount {
        String getCategory();
        long getCount();
    }
}
