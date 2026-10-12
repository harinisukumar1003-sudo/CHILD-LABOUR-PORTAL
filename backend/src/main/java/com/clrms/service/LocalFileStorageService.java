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
    private static final long MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "mp4", "pdf", "webm", "mp3", "wav", "m4a");
    private final Path root;

    public LocalFileStorageService(@Value("${app.storage-dir:uploads}") String storageDirectory) {
        root = Paths.get(storageDirectory).toAbsolutePath().normalize();
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Evidence file cannot be empty");
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) throw new IllegalArgumentException("Only jpg, jpeg, png, mp4, pdf, webm, mp3, wav, and m4a files are allowed");
        if (isAudioExtension(extension)) {
            if (file.getSize() > MAX_AUDIO_FILE_SIZE) throw new IllegalArgumentException("Audio evidence must be at most 5MB");
            validateAudioMimeType(extension, file.getContentType());
        } else if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Each evidence file must be at most 10MB");
        }
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

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private boolean isAudioExtension(String extension) {
        return Set.of("webm", "mp3", "wav", "m4a").contains(extension);
    }

    private void validateAudioMimeType(String extension, String contentType) {
        Set<String> allowedTypes = switch (extension) {
            case "webm" -> Set.of("audio/webm");
            case "mp3" -> Set.of("audio/mpeg", "audio/mp3");
            case "wav" -> Set.of("audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave");
            case "m4a" -> Set.of("audio/mp4", "audio/x-m4a", "audio/m4a");
            default -> Set.of();
        };
        String normalizedType = contentType == null ? "" : contentType.toLowerCase(Locale.ROOT).split(";", 2)[0].trim();
        if (!allowedTypes.contains(normalizedType)) {
            throw new IllegalArgumentException("Audio MIME type does not match the file extension");
        }
    }
}