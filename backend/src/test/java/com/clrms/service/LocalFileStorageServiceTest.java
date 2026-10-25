package com.clrms.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalFileStorageServiceTest {
    @TempDir
    Path storageDirectory;

    @Test
    void createsStorageDirectoryWhenServiceStarts() {
        Path nestedDirectory = storageDirectory.resolve("new").resolve("uploads");

        new LocalFileStorageService(nestedDirectory.toString()).createStorageDirectory();

        assertTrue(Files.isDirectory(nestedDirectory));
    }

    @Test
    void storesSupportedAudioUnderFiveMegabytes() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile audio = new MockMultipartFile("file", "statement.webm", "audio/webm", new byte[]{1, 2, 3});

        String url = assertDoesNotThrow(() -> storage.store(audio));

        assertTrue(Files.exists(storageDirectory.resolve(url.substring("/uploads/".length()))));
    }

    @Test
    void rejectsAudioWhenMimeTypeDoesNotMatchExtension() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile audio = new MockMultipartFile("file", "statement.wav", "audio/mpeg", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> storage.store(audio));
    }

    @Test
    void rejectsAudioLargerThanFiveMegabytes() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        byte[] content = new byte[5 * 1024 * 1024 + 1];
        Arrays.fill(content, (byte) 1);
        MockMultipartFile audio = new MockMultipartFile("file", "statement.mp3", "audio/mpeg", content);

        assertThrows(IllegalArgumentException.class, () -> storage.store(audio));
    }

    @Test
    void acceptsWebpPhotoWithMatchingMimeType() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile photo = new MockMultipartFile("files", "evidence.webp", "image/webp", new byte[]{1, 2, 3});

        String url = storage.store(photo);

        assertTrue(Files.exists(storageDirectory.resolve(url.substring("/uploads/".length()))));
    }

    @Test
    void acceptsOggAudioWithMatchingMimeType() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile audio = new MockMultipartFile("files", "statement.ogg", "audio/ogg", new byte[]{1, 2, 3});

        assertDoesNotThrow(() -> storage.store(audio));
    }

    @Test
    void rejectsPhotoWhenMimeTypeDoesNotMatchExtension() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile photo = new MockMultipartFile("files", "evidence.png", "application/pdf", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> storage.store(photo));
    }

    @Test
    void enforcesTenMegabytePhotoLimit() {
        LocalFileStorageService storage = new LocalFileStorageService(storageDirectory.toString());
        MockMultipartFile oversizedPhoto = new MockMultipartFile("files", "evidence.jpg", "image/jpeg",
                new byte[10 * 1024 * 1024 + 1]);

        assertThrows(IllegalArgumentException.class, () -> storage.store(oversizedPhoto));
    }
}
