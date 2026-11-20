package com.paypilot.config;

import com.paypilot.model.User;
import com.paypilot.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    public DataSeeder(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.findById("admin").isPresent()) {
            User admin = new User();
            admin.setUserId("admin");
            admin.setEmail("admin@paypilot.com");
            admin.setPassword(new BCryptPasswordEncoder().encode("Admin@123"));
            admin.setAdmin(true);
            admin.setStatus("active");
            userRepository.save(admin);
            System.out.println("Seeded admin user -> userId: admin | password: Admin@123");
        }
        System.out.println("PayPilot server running at http://localhost:3000");
    }
}
