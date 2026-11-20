package com.paypilot.util;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Java 8 stand-in for {@code Map.of(...)} (a Java 9+ API). Pairs up the given
 * key/value varargs into an insertion-ordered map.
 */
public final class Maps {
    private Maps() {}

    public static Map<String, Object> of(Object... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("Maps.of requires an even number of arguments");
        }
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            map.put((String) kv[i], kv[i + 1]);
        }
        return map;
    }
}
