package com.clrms.util;

public final class InputSanitizer {
    private InputSanitizer() { }
    public static String clean(String value) {
        if (value == null) return null;
        return value.replaceAll("<[^>]*>", "").replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "").trim();
    }
}