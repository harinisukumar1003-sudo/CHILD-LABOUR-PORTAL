package com.clrms.service;

import com.clrms.entity.EvidenceFileType;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class EvidenceFileRules {
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;
    private static final long MAX_AUDIO_FILE_SIZE = 5 * 1024 * 1024;
    private static final Map<String, Set<String>> MIME_TYPES = Map.ofEntries(
            Map.entry("jpg", Set.of("image/jpeg")),
            Map.entry("jpeg", Set.of("image/jpeg")),
            Map.entry("png", Set.of("image/png")),
            Map.entry("webp", Set.of("image/webp")),
            Map.entry("mp4", Set.of("video/mp4")),
            Map.entry("pdf", Set.of("application/pdf")),
            Map.entry("webm", Set.of("audio/webm")),
            Map.entry("mp3", Set.of("audio/mpeg", "audio/mp3")),
            Map.entry("wav", Set.of("audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave")),
            Map.entry("m4a", Set.of("audio/mp4", "audio/x-m4a", "audio/m4a")),
            Map.entry("ogg", Set.of("audio/ogg", "application/ogg"))
    );
    private static final Set<String> PHOTO_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("webm", "mp3", "wav", "m4a", "ogg");

    private EvidenceFileRules() { }

    static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Evidence file cannot be empty");
        String extension = extensionOf(file.getOriginalFilename());
        Set<String> expectedTypes = MIME_TYPES.get(extension);
        if (expectedTypes == null) {
            throw new IllegalArgumentException("Supported evidence types are JPEG, PNG, WEBP, MP4, PDF, WEBM, MP3, WAV, M4A, and OGG");
        }
        String mimeType = normalizeMimeType(file.getContentType());
        if (!expectedTypes.contains(mimeType)) {
            throw new IllegalArgumentException("Evidence MIME type does not match the file extension");
        }
        long maxSize = AUDIO_EXTENSIONS.contains(extension) ? MAX_AUDIO_FILE_SIZE : MAX_FILE_SIZE;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException(AUDIO_EXTENSIONS.contains(extension)
                    ? "Audio evidence must be at most 5MB"
                    : "Each evidence file must be at most 10MB");
        }
    }

    static boolean isPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;
        String extension = extensionOf(file.getOriginalFilename());
        return PHOTO_EXTENSIONS.contains(extension)
                && MIME_TYPES.get(extension).contains(normalizeMimeType(file.getContentType()));
    }

    static boolean isAudio(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;
        String extension = extensionOf(file.getOriginalFilename());
        return AUDIO_EXTENSIONS.contains(extension)
                && MIME_TYPES.get(extension).contains(normalizeMimeType(file.getContentType()));
    }

    static EvidenceFileType fileType(MultipartFile file) {
        String extension = extensionOf(file.getOriginalFilename());
        if (PHOTO_EXTENSIONS.contains(extension)) return EvidenceFileType.IMAGE;
        if (AUDIO_EXTENSIONS.contains(extension)) return EvidenceFileType.AUDIO;
        return "mp4".equals(extension) ? EvidenceFileType.VIDEO : EvidenceFileType.DOCUMENT;
    }

    static String extensionOf(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private static String normalizeMimeType(String contentType) {
        return contentType == null ? "" : contentType.toLowerCase(Locale.ROOT).split(";", 2)[0].trim();
    }
}
