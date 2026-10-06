package com.lisone.dmassistant.marker;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class MarkerDtos {

    private MarkerDtos() {
    }

    public record MarkerTypeRequest(
            @NotBlank @Size(max = 60) String name,
            @NotNull MarkerShape shape,
            @NotNull @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a hex color like #A1B2C3") String color,
            @Size(max = 16) String icon,
            Integer sortOrder) {
    }

    public record MarkerTypeResponse(
            Long id,
            String name,
            MarkerShape shape,
            String color,
            String icon,
            int sortOrder,
            boolean builtIn) {

        static MarkerTypeResponse from(MarkerType type) {
            return new MarkerTypeResponse(type.getId(), type.getName(), type.getShape(), type.getColor(),
                    type.getIcon(), type.getSortOrder(), type.isBuiltIn());
        }
    }

    public record MarkerRequest(
            @NotNull Long typeId,
            @NotBlank @Size(max = 120) String title,
            @Size(max = 10000) String description,
            @Size(max = 10000) String gmNotes,
            @NotNull Double x,
            @NotNull Double y,
            MarkerVisibility visibility) {
    }

    public record VisibilityRequest(@NotNull MarkerVisibility visibility) {
    }

    public record MarkerResponse(
            Long id,
            Long mapId,
            Long typeId,
            String title,
            String description,
            /* Always null for players. */
            String gmNotes,
            double x,
            double y,
            MarkerVisibility visibility,
            Instant createdAt,
            Instant updatedAt) {

        static MarkerResponse forMaster(Marker m) {
            return new MarkerResponse(m.getId(), m.getMapId(), m.getMarkerTypeId(), m.getTitle(), m.getDescription(),
                    m.getGmNotes(), m.getX(), m.getY(), m.getVisibility(), m.getCreatedAt(), m.getUpdatedAt());
        }

        static MarkerResponse forPlayer(Marker m) {
            return new MarkerResponse(m.getId(), m.getMapId(), m.getMarkerTypeId(), m.getTitle(), m.getDescription(),
                    null, m.getX(), m.getY(), m.getVisibility(), m.getCreatedAt(), m.getUpdatedAt());
        }
    }

    public record NoteRequest(@NotBlank @Size(max = 10000) String content) {
    }

    public record NoteResponse(Long id, Long markerId, String content, Instant createdAt, Instant updatedAt) {

        static NoteResponse from(MarkerNote note) {
            return new NoteResponse(note.getId(), note.getMarkerId(), note.getContent(), note.getCreatedAt(),
                    note.getUpdatedAt());
        }
    }
}
