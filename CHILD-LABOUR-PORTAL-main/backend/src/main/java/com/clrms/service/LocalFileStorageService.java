package com.clrms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {
    private final Path root;

    public LocalFileStorageService(@Value("${app.storage-dir:${user.dir}/uploads}") String storageDirectory) {
        root = Paths.get(storageDirectory).toAbsolutePath().normalize();
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(LocalFileStorageService.class);

    @PostConstruct
    void createStorageDirectory() {
        try {
            Files.createDirectories(root);
            log.info("Uploads storage directory initialized at: {}", root);
        } catch (IOException exception) {
            log.error("Unable to create evidence storage directory: {}", root, exception);
            throw new IllegalStateException("Unable to create evidence storage directory: " + root, exception);
        }
    }

    @Override
    public String store(MultipartFile file) {
        EvidenceFileRules.validate(file);
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String extension = EvidenceFileRules.extensionOf(originalName);
        try {
            Files.createDirectories(root);
            String storedName = UUID.randomUUID() + "." + extension;
            try (var inputStream = file.getInputStream()) {
                Files.copy(inputStream, root.resolve(storedName));
            }
            return "/uploads/" + storedName;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to store evidence file", exception);
        }
    }

}