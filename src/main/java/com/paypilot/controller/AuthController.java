package com.paypilot.controller;

import com.paypilot.util.Maps;
import com.paypilot.dto.CaptchaChallenge;
import com.paypilot.dto.Requests.*;
import com.paypilot.security.AuthInterceptor;
import com.paypilot.service.ApiException;
import com.paypilot.service.AuthService;
import javax.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody SignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signup(req));
    }

    @PostMapping("/screen-challenge")
    public ResponseEntity<CaptchaChallenge> screenChallenge(@RequestBody ScreenChallengeRequest req) {
        authService.ensureCanChallenge(req.getUserId()); // throws 404 if missing, 423 if locked
        return ResponseEntity.ok(authService.makeChallenge(req.getUserId()));
    }

    @PostMapping("/verify-screen")
    public ResponseEntity<Map<String, Object>> verifyScreen(@RequestBody VerifyScreenRequest req) {
        authService.verifyChallenge(req.getUserId(), req.getAnswer());
        String otp = authService.issueLoginOtp(req.getUserId());
        return ResponseEntity.ok(Maps.of("message", "Screen Verification Successful!!", "devOtp", otp));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest req) {
        authService.verifyLoginOtp(req.getUserId(), req.getOtp());
        return ResponseEntity.ok(Maps.of("message", "OTP Verified!"));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.getUserId(), req.getPassword()));
    }

    @PostMapping("/forgot/request")
    public ResponseEntity<Map<String, Object>> forgotRequest(@RequestBody ForgotRequestRequest req) {
        String otp = authService.requestPasswordReset(req.getUserId(), req.getEmail());
        return ResponseEntity.ok(Maps.of("message", "OTP sent to your registered email id", "devOtp", otp));
    }

    @PostMapping("/forgot/verify")
    public ResponseEntity<Map<String, Object>> forgotVerify(@RequestBody ForgotVerifyRequest req) {
        authService.verifyPasswordResetOtp(req.getUserId(), req.getOtp());
        return ResponseEntity.ok(Maps.of("message", "OTP Verified!"));
    }

    @PostMapping("/forgot/reset")
    public ResponseEntity<Map<String, Object>> forgotReset(@RequestBody ForgotResetRequest req) {
        authService.resetPassword(req.getUserId(), req.getNewPassword(), req.getConfirmPassword());
        return ResponseEntity.ok(Maps.of("message", "Password has been updated"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        String userId = (String) request.getAttribute(AuthInterceptor.USER_ID_ATTR);
        return ResponseEntity.ok(Maps.of("user", authService.getUser(userId)));
    }

    @GetMapping("/admin/pending-users")
    public ResponseEntity<Map<String, Object>> pendingUsers(HttpServletRequest request) {
        requireAdmin(request);
        return ResponseEntity.ok(Maps.of("users", authService.listPendingUsers()));
    }

    @PostMapping("/admin/approve/{userId}")
    public ResponseEntity<Map<String, Object>> approve(@PathVariable String userId, HttpServletRequest request) {
        requireAdmin(request);
        authService.approveUser(userId);
        return ResponseEntity.ok(Maps.of("message", "User access approved."));
    }

    private void requireAdmin(HttpServletRequest request) {
        Boolean isAdmin = (Boolean) request.getAttribute(AuthInterceptor.IS_ADMIN_ATTR);
        if (isAdmin == null || !isAdmin) {
            throw ApiException.forbidden("Admin access required.");
        }
    }
}
