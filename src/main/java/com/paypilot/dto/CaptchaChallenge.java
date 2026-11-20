package com.paypilot.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class CaptchaChallenge {
    private final String target;
    private final List<Cell> grid;

    @Getter
    @AllArgsConstructor
    public static class Cell {
        private final int id;
        private final String emoji;
    }
}
