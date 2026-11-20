package com.paypilot.dto;

import java.util.List;

public record CaptchaChallenge(String target, List<Cell> grid) {
    public record Cell(int id, String emoji) {}
}
