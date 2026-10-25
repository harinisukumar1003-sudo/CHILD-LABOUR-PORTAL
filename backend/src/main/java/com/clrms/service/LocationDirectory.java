package com.clrms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class LocationDirectory {
    private final Map<String, List<String>> statesAndDistricts;

    @Autowired
    public LocationDirectory(ObjectMapper objectMapper) {
        this.statesAndDistricts = load(objectMapper);
    }

    public LocationDirectory() {
        this(new ObjectMapper());
    }

    public Map<String, List<String>> getStatesAndDistricts() {
        return statesAndDistricts;
    }

    public boolean containsDistrict(String state, String district) {
        if (state == null || district == null) return false;
        return statesAndDistricts.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(state.trim()))
                .flatMap(entry -> entry.getValue().stream())
                .anyMatch(value -> value.equalsIgnoreCase(district.trim()));
    }

    private Map<String, List<String>> load(ObjectMapper objectMapper) {
        try (var input = new ClassPathResource("indian-locations.json").getInputStream()) {
            return objectMapper.readValue(input, new TypeReference<>() { });
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load Indian states and districts", exception);
        }
    }
}
