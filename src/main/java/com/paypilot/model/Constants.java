package com.paypilot.model;

import java.util.List;

public final class Constants {

    private Constants() {}

    public static final List<String> BILL_CATEGORIES = List.of(
        "Debt Payments", "House Rent", "Groceries", "Internet Charges", "Retirement Charges", "Cell phone charges"
    );

    public static final List<String> REMINDER_FREQUENCIES = List.of("Daily", "Weekly", "Bi-weekly", "Monthly");

    public static final List<String> PAYMENT_METHODS = List.of("Net Banking", "Credit Card", "Debit Card");

    public static final String STATUS_NOT_PAID = "Not Paid";
    public static final String STATUS_PARTIALLY_PAID = "Partially Paid";
    public static final String STATUS_PAID = "Paid";
}
