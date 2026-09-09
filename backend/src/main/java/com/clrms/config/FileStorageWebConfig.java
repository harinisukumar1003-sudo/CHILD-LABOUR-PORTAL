package com.clrms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class FileStorageWebConfig implements WebMvcConfigurer {
    private final String storageLocation;

    public FileStorageWebConfig(@Value("${app.storage-dir:uploads}") String storageDirectory) {
        storageLocation = Paths.get(storageDirectory).toAbsolutePath().normalize().toUri().toString();
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**").addResourceLocations(storageLocation);
    }
}