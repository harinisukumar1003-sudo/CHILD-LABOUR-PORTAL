package com.clrms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "png", "mp4", "pdf");
    private final Path root;

    public LocalFileStorageService(@Value("${app.storage-dir:uploads}") String storageDirectory) {
        root = Paths.get(storageDirectory).toAbsolutePath().normalize();
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Evidence file cannot be empty");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("Each evidence file must be at most 10MB");
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) throw new IllegalArgumentException("Only jpg, png, mp4, and pdf files are allowed");
        try {
            Files.createDirectories(root);
            String storedName = UUID.randomUUID() + "." + extension;
            Files.copy(file.getInputStream(), root.resolve(storedName));
            return "/uploads/" + storedName;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to store evidence file", exception);
        }
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}