package com.lisone.dmassistant.map;

import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.regex.Pattern;

@Component
public class FileSystemMapStorage implements MapStorage {

    private static final Logger log = LoggerFactory.getLogger(FileSystemMapStorage.class);
    private static final Pattern SAFE_KEY = Pattern.compile("[A-Za-z0-9-]+\\.[a-z]{3,4}");

    private final Path root;

    public FileSystemMapStorage(AppProperties props) throws IOException {
        String dir = props.storage() != null && props.storage().mapsDir() != null
                ? props.storage().mapsDir() : "./data/maps";
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public void store(String key, InputStream content) throws IOException {
        Path target = resolve(key);
        Path temp = Files.createTempFile(root, "upload-", ".tmp");
        try {
            Files.copy(content, temp, StandardCopyOption.REPLACE_EXISTING);
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    @Override
    public Resource load(String key) {
        Path path = resolve(key);
        if (!Files.isReadable(path)) {
            throw ApiException.notFound("Map image");
        }
        return new FileSystemResource(path);
    }

    @Override
    public void deleteQuietly(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException | RuntimeException e) {
            log.warn("Could not delete map image {}", key, e);
        }
    }

    private Path resolve(String key) {
        if (!SAFE_KEY.matcher(key).matches()) {
            throw new IllegalArgumentException("Unsafe storage key: " + key);
        }
        return root.resolve(key);
    }
}
