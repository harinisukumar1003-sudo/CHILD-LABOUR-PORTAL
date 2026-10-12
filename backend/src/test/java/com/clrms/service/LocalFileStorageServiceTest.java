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
}
