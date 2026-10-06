package com.lisone.dmassistant.map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class MapDtos {

    private MapDtos() {
    }

    public record MapUpdateRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 5000) String description) {
    }

    public record MapResponse(
            Long id,
            Long campaignId,
            String name,
            String description,
            int width,
            int height,
            String imageUrl,
            long markerCount,
            Instant createdAt,
            Instant updatedAt) {

        static MapResponse from(GameMap map, long markerCount) {
            String imageUrl = "/api/campaigns/" + map.getCampaignId() + "/maps/" + map.getId() + "/image";
            return new MapResponse(map.getId(), map.getCampaignId(), map.getName(), map.getDescription(),
                    map.getWidth(), map.getHeight(), imageUrl, markerCount, map.getCreatedAt(), map.getUpdatedAt());
        }
    }
}
