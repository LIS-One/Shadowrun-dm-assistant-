package com.lisone.dmassistant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Auth0 auth0, DevAuth devAuth, Storage storage, Cors cors) {

    /**
     * Auth0 API settings. {@code issuer} is the tenant URL with a trailing slash
     * (e.g. https://my-tenant.eu.auth0.com/), {@code audience} is the API identifier.
     */
    public record Auth0(String issuer, String audience) {
    }

    /**
     * Local development login that replaces Auth0 with HS256 tokens minted by the frontend.
     * Never enable it on a public deployment.
     */
    public record DevAuth(boolean enabled, String secret) {
    }

    public record Storage(String mapsDir) {
    }

    public record Cors(List<String> allowedOrigins) {
    }
}
