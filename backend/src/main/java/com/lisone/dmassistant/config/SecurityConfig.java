package com.lisone.dmassistant.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;

@Configuration
public class SecurityConfig {

    public static final String DEV_ISSUER = "dm-assistant-dev";

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(loggingEntryPoint()));
        return http.build();
    }

    /**
     * Logs why a token was rejected (e.g. "The iss claim is not valid" for a wrong AUTH0_DOMAIN), which Spring only
     * reports in a response header. Requests without any token are not logged.
     */
    private static AuthenticationEntryPoint loggingEntryPoint() {
        AuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
        return (request, response, ex) -> {
            if (ex instanceof OAuth2AuthenticationException) {
                log.warn("Rejected access token for {} {}: {}", request.getMethod(), request.getRequestURI(),
                        ex.getMessage());
            }
            delegate.commence(request, response, ex);
        };
    }

    @Bean
    JwtDecoder jwtDecoder(AppProperties props) {
        AppProperties.DevAuth dev = props.devAuth();
        if (dev != null && dev.enabled()) {
            return devJwtDecoder(dev);
        }
        return auth0JwtDecoder(props.auth0());
    }

    private JwtDecoder auth0JwtDecoder(AppProperties.Auth0 auth0) {
        if (auth0 == null || !StringUtils.hasText(auth0.issuer()) || !StringUtils.hasText(auth0.audience())) {
            throw new IllegalStateException("app.auth0.issuer and app.auth0.audience must be configured "
                    + "(or enable app.dev-auth for local development)");
        }
        String issuer = auth0.issuer().endsWith("/") ? auth0.issuer() : auth0.issuer() + "/";
        // Auth0 publishes its signing keys at a fixed location, so no discovery call is needed at startup.
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(issuer + ".well-known/jwks.json").build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer),
                audienceValidator(auth0.audience())));
        return decoder;
    }

    private JwtDecoder devJwtDecoder(AppProperties.DevAuth dev) {
        if (!StringUtils.hasText(dev.secret()) || dev.secret().length() < 32) {
            throw new IllegalStateException("app.dev-auth.secret must be at least 32 characters long");
        }
        log.warn("DEV AUTH IS ENABLED: Auth0 is bypassed and locally signed tokens are accepted. "
                + "Never use this mode on a public deployment.");
        SecretKeySpec key = new SecretKeySpec(dev.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(DEV_ISSUER));
        return decoder;
    }

    private static OAuth2TokenValidator<Jwt> audienceValidator(String audience) {
        return new JwtClaimValidator<Collection<String>>(JwtClaimNames.AUD,
                aud -> aud != null && aud.contains(audience));
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        List<String> origins = props.cors() == null ? null : props.cors().allowedOrigins();
        if (origins != null && !origins.isEmpty()) {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOrigins(origins);
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
            config.setMaxAge(3600L);
            source.registerCorsConfiguration("/api/**", config);
        }
        return source;
    }
}
