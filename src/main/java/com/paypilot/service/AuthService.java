package com.paypilot.service;

import com.paypilot.util.Maps;
import com.paypilot.dto.CaptchaChallenge;
import com.paypilot.dto.Requests.*;
import com.paypilot.dto.UserView;
import com.paypilot.model.User;
import com.paypilot.repository.UserRepository;
import com.paypilot.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final long OTP_TTL_MS = 5 * 60 * 1000;
    private static final long VERIFICATION_TTL_MS = 10 * 60 * 1000;
    private static final int MAX_FAILED_ATTEMPTS = 3;

    // Image-selection "screen verification" grid, matching the BRD wireframe's
    // "select all images with a bus" captcha (emoji stand in for real photos).
    private static final String[] CAPTCHA_OBJECTS = {"🚌", "🚗", "🚲", "🍊", "🍎", "🍌", "🏠", "⚽", "🌳"};

    // In-memory verification state for the two-step login flow. A single-process
    // store; a production deployment would back this with a cache like Redis.
    private final Map<String, ChallengeEntry> challengeStore = new ConcurrentHashMap<>();
    private final Map<String, Long> screenVerified = new ConcurrentHashMap<>();
    private final Map<String, Long> otpVerified = new ConcurrentHashMap<>();
    private final Map<String, Long> resetVerified = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    private static final class ChallengeEntry {
        private final List<Integer> correctIds;
        private final long expires;

        private ChallengeEntry(List<Integer> correctIds, long expires) {
            this.correctIds = correctIds;
            this.expires = expires;
        }

        private List<Integer> correctIds() { return correctIds; }
        private long expires() { return expires; }
    }

    private boolean isExpired(Long expires) {
        return expires == null || System.currentTimeMillis() > expires;
    }

    private String generateOtp() {
        return String.valueOf(100000 + random.nextInt(900000));
    }

    public void ensureCanChallenge(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Account doesn't exist"));
        if (user.isLocked()) {
            throw ApiException.locked("Your account has been locked!!");
        }
    }

    public CaptchaChallenge makeChallenge(String userId) {
        String target = CAPTCHA_OBJECTS[random.nextInt(CAPTCHA_OBJECTS.length)];
        List<String> distractors = new ArrayList<>();
        for (String o : CAPTCHA_OBJECTS) if (!o.equals(target)) distractors.add(o);

        int matchCount = 2 + random.nextInt(2); // 2-3 correct tiles
        List<String> cells = new ArrayList<>();
        for (int i = 0; i < matchCount; i++) cells.add(target);
        while (cells.size() < 9) cells.add(distractors.get(random.nextInt(distractors.size())));
        Collections.shuffle(cells, random);

        List<CaptchaChallenge.Cell> grid = new ArrayList<>();
        List<Integer> correctIds = new ArrayList<>();
        for (int i = 0; i < cells.size(); i++) {
            grid.add(new CaptchaChallenge.Cell(i, cells.get(i)));
            if (cells.get(i).equals(target)) correctIds.add(i);
        }
        challengeStore.put(userId, new ChallengeEntry(correctIds, System.currentTimeMillis() + VERIFICATION_TTL_MS));
        return new CaptchaChallenge(target, grid);
    }

    public void verifyChallenge(String userId, List<Integer> selectedIds) {
        ChallengeEntry entry = challengeStore.get(userId);
        if (entry == null || isExpired(entry.expires())) {
            throw ApiException.badRequest("Screen Verification Unsuccessful! Try Again");
        }
        List<Integer> selected = new ArrayList<>(new TreeSet<>(selectedIds == null ? Collections.<Integer>emptyList() : selectedIds));
        List<Integer> correct = new ArrayList<>(new TreeSet<>(entry.correctIds()));
        if (!selected.equals(correct)) {
            throw ApiException.badRequest("Screen Verification Unsuccessful! Try Again");
        }
        challengeStore.remove(userId);
        screenVerified.put(userId, System.currentTimeMillis() + VERIFICATION_TTL_MS);
    }

    public String issueLoginOtp(String userId) {
        String otp = generateOtp();
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Account doesn't exist"));
        user.setLoginOtp(otp);
        user.setLoginOtpExpires(System.currentTimeMillis() + OTP_TTL_MS);
        userRepository.save(user);
        return otp;
    }

    public void verifyLoginOtp(String userId, String otp) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getLoginOtp() == null || isExpired(user.getLoginOtpExpires())) {
            throw ApiException.badRequest("OTP expired. Please try again.");
        }
        if (!Objects.equals(otp == null ? null : otp.trim(), user.getLoginOtp())) {
            throw ApiException.badRequest("Invalid OTP. Please try again.");
        }
        user.setLoginOtp(null);
        user.setLoginOtpExpires(null);
        userRepository.save(user);
        otpVerified.put(userId, System.currentTimeMillis() + VERIFICATION_TTL_MS);
    }

    public Map<String, Object> signup(SignupRequest req) {
        if (isBlank(req.getEmail()) || isBlank(req.getUserId()) || isBlank(req.getPassword()) || isBlank(req.getConfirmPassword())) {
            throw ApiException.badRequest("All required fields must be provided.");
        }
        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw ApiException.badRequest("Password and confirm password do not match.");
        }
        if (userRepository.findById(req.getUserId()).isPresent() || userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw ApiException.conflict("Account already exists!");
        }
        User user = new User();
        user.setUserId(req.getUserId());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setPanDetails(req.getPanDetails());
        user.setBankAccountNumber(req.getBankAccountNumber());
        user.setIfscCode(req.getIfscCode());
        user.setBankingPartner(req.getBankingPartner());
        user.setAdmin(false);
        user.setStatus("pending");
        userRepository.save(user);
        return Maps.of("ok", true, "message", "User Access Successfully Raised!!", "user", new UserView(user));
    }

    public Map<String, Object> login(String userId, String password) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Account doesn't exist"));
        if (user.isLocked()) {
            throw ApiException.locked("Your account has been locked!! Use Forgot Password to reset.");
        }
        if ("pending".equals(user.getStatus())) {
            throw ApiException.forbidden("Your access request is pending admin approval.");
        }
        Long screenOk = screenVerified.get(userId);
        Long otpOk = otpVerified.get(userId);
        if (screenOk == null || isExpired(screenOk) || otpOk == null || isExpired(otpOk)) {
            throw ApiException.badRequest("Please complete Screen Verification and OTP Verification first.");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                user.setLocked(true);
                userRepository.save(user);
                throw ApiException.locked("Invalid ID/Password. Your account has been locked!!");
            }
            userRepository.save(user);
            throw ApiException.badRequest("Invalid ID/Password");
        }
        user.setFailedAttempts(0);
        userRepository.save(user);
        screenVerified.remove(userId);
        otpVerified.remove(userId);
        String token = jwtUtil.generateToken(user.getUserId(), user.isAdmin());
        return Maps.of("token", token, "user", new UserView(user));
    }

    public String requestPasswordReset(String userId, String email) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || !user.getEmail().equals(email)) {
            throw ApiException.notFound("Account doesn't exist");
        }
        String otp = generateOtp();
        user.setResetOtp(otp);
        user.setResetOtpExpires(System.currentTimeMillis() + OTP_TTL_MS);
        userRepository.save(user);
        return otp;
    }

    public void verifyPasswordResetOtp(String userId, String otp) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getResetOtp() == null || isExpired(user.getResetOtpExpires())) {
            throw ApiException.badRequest("OTP expired. Please try again.");
        }
        if (!Objects.equals(otp == null ? null : otp.trim(), user.getResetOtp())) {
            throw ApiException.badRequest("Invalid OTP. Please try again.");
        }
        user.setResetOtp(null);
        user.setResetOtpExpires(null);
        userRepository.save(user);
        resetVerified.put(userId, System.currentTimeMillis() + VERIFICATION_TTL_MS);
    }

    public void resetPassword(String userId, String newPassword, String confirmPassword) {
        Long ok = resetVerified.get(userId);
        if (ok == null || isExpired(ok)) {
            throw ApiException.badRequest("Please verify the OTP first.");
        }
        if (!Objects.equals(newPassword, confirmPassword)) {
            throw ApiException.badRequest("Password and confirm password do not match.");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Account doesn't exist"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedAttempts(0);
        user.setLocked(false);
        userRepository.save(user);
        resetVerified.remove(userId);
    }

    public UserView getUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("Account doesn't exist"));
        return new UserView(user);
    }

    public List<Map<String, Object>> listPendingUsers() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : userRepository.findByStatus("pending")) {
            out.add(Maps.of("user_id", u.getUserId(), "email", u.getEmail(), "created_at", u.getCreatedAt().toString()));
        }
        return out;
    }

    public void approveUser(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User not found."));
        user.setStatus("active");
        userRepository.save(user);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
