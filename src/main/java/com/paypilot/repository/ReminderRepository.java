package com.paypilot.repository;

import com.paypilot.model.ReminderSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReminderRepository extends JpaRepository<ReminderSettings, String> {
    Optional<ReminderSettings> findByBillId(String billId);
}
