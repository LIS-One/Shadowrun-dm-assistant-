package com.lisone.dmassistant.map;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

/** Where map images live. The default implementation uses the local filesystem; swap in S3 etc. later. */
public interface MapStorage {

    void store(String key, InputStream content) throws IOException;

    Resource load(String key);

    void deleteQuietly(String key);
}
