package com.lisone.dmassistant.user;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

@Service
public class UserService {

    private final AppUserRepository users;
    private final TransactionTemplate newTransaction;

    public UserService(AppUserRepository users, PlatformTransactionManager txManager) {
        this.users = users;
        this.newTransaction = new TransactionTemplate(txManager);
        this.newTransaction.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
    }

    /**
     * Finds the local user for an access token, creating it on first sight.
     * Two parallel first requests may race on the unique subject; the loser simply re-reads.
     */
    public AppUser resolve(Jwt jwt) {
        String subject = jwt.getSubject();
        return users.findByAuth0Subject(subject).orElseGet(() -> {
            try {
                return newTransaction.execute(status -> users.save(newUserFromToken(jwt)));
            } catch (DataIntegrityViolationException race) {
                return users.findByAuth0Subject(subject).orElseThrow(() -> race);
            }
        });
    }

    @Transactional
    public AppUser updateProfile(AppUser user, UserDtos.ProfileUpdate update) {
        AppUser managed = users.findById(user.getId()).orElseThrow();
        if (StringUtils.hasText(update.displayName())) {
            managed.setDisplayName(update.displayName().trim());
        }
        if (update.email() != null) {
            managed.setEmail(StringUtils.hasText(update.email()) ? update.email().trim() : null);
        }
        if (update.avatarUrl() != null) {
            managed.setAvatarUrl(StringUtils.hasText(update.avatarUrl()) ? update.avatarUrl().trim() : null);
        }
        return managed;
    }

    private static AppUser newUserFromToken(Jwt jwt) {
        String name = firstNonBlank(jwt.getClaimAsString("name"), jwt.getClaimAsString("nickname"),
                jwt.getClaimAsString("email"));
        if (name == null) {
            String subject = jwt.getSubject();
            name = "Runner-" + subject.substring(Math.max(0, subject.length() - 6));
        }
        AppUser user = new AppUser(jwt.getSubject(), truncate(name, 120));
        user.setEmail(jwt.getClaimAsString("email"));
        user.setAvatarUrl(jwt.getClaimAsString("picture"));
        return user;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
