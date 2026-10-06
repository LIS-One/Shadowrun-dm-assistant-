package com.lisone.dmassistant.character;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public final class CharacterDtos {

    private CharacterDtos() {
    }

    public record CharacterRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull Map<String, Object> sheet) {
    }

    public record CharacterSummary(
            Long id,
            String name,
            Long ownerId,
            String ownerName,
            String metatype,
            String role,
            boolean mine,
            Instant updatedAt) {
    }

    public record CharacterResponse(
            Long id,
            Long campaignId,
            String name,
            Long ownerId,
            String ownerName,
            boolean editable,
            Map<String, Object> sheet,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record NoteRequest(
            @NotBlank @Size(max = 160) String title,
            @Size(max = 20000) String content) {
    }

    public record NoteResponse(Long id, Long characterId, String title, String content, Instant createdAt,
                               Instant updatedAt) {

        static NoteResponse from(CharacterNote note) {
            return new NoteResponse(note.getId(), note.getCharacterId(), note.getTitle(), note.getContent(),
                    note.getCreatedAt(), note.getUpdatedAt());
        }
    }
}
