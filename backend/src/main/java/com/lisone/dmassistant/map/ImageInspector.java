package com.lisone.dmassistant.map;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Optional;

/**
 * Detects the real image format from magic bytes (the client-sent Content-Type is not trusted)
 * and reads dimensions from the header without decoding the whole, possibly huge, image.
 */
final class ImageInspector {

    enum ImageFormat {
        PNG("image/png", "png"),
        JPEG("image/jpeg", "jpg"),
        GIF("image/gif", "gif"),
        WEBP("image/webp", "webp");

        final String contentType;
        final String extension;

        ImageFormat(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }
    }

    record Dimensions(int width, int height) {
    }

    private ImageInspector() {
    }

    static Optional<ImageFormat> detectFormat(byte[] head) {
        if (startsWith(head, new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) {
            return Optional.of(ImageFormat.PNG);
        }
        if (startsWith(head, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) {
            return Optional.of(ImageFormat.JPEG);
        }
        if (startsWith(head, "GIF87a".getBytes(StandardCharsets.US_ASCII))
                || startsWith(head, "GIF89a".getBytes(StandardCharsets.US_ASCII))) {
            return Optional.of(ImageFormat.GIF);
        }
        if (head.length >= 12 && startsWith(head, "RIFF".getBytes(StandardCharsets.US_ASCII))
                && Arrays.equals(Arrays.copyOfRange(head, 8, 12), "WEBP".getBytes(StandardCharsets.US_ASCII))) {
            return Optional.of(ImageFormat.WEBP);
        }
        return Optional.empty();
    }

    /** Returns empty when no ImageIO reader exists for the format (e.g. WebP on a stock JDK). */
    static Optional<Dimensions> readDimensions(InputStream in) throws IOException {
        try (ImageInputStream stream = ImageIO.createImageInputStream(in)) {
            if (stream == null) {
                return Optional.empty();
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) {
                return Optional.empty();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                return Optional.of(new Dimensions(reader.getWidth(0), reader.getHeight(0)));
            } finally {
                reader.dispose();
            }
        }
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
