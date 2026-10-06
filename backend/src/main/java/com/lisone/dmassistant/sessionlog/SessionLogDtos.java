package com.lisone.dmassistant.sessionlog;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class SessionLogDtos {

    private SessionLogDtos() {
    }

    public record SessionLogRequest(
            @Min(0) Integer sessionNumber,
            @NotBlank @Size(max = 200) String title,
            LocalDate playedOn,
            @Size(max = 2000) String summary,
            @Size(max = 100000) String content,
            boolean published) {
    }

    public record SessionLogResponse(
            Long id,
            Long campaignId,
            Integer sessionNumber,
            String title,
            LocalDate playedOn,
            String summary,
            String content,
            boolean published,
            String authorName,
            Instant createdAt,
            Instant updatedAt) {

        static SessionLogResponse from(SessionLog log) {
            return new SessionLogResponse(log.getId(), log.getCampaignId(), log.getSessionNumber(), log.getTitle(),
                    log.getPlayedOn(), log.getSummary(), log.getContent(), log.isPublished(),
                    log.getAuthor() == null ? null : log.getAuthor().getDisplayName(),
                    log.getCreatedAt(), log.getUpdatedAt());
        }
    }
}
