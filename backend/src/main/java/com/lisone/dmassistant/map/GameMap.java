package com.lisone.dmassistant.map;

import com.lisone.dmassistant.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An uploaded map image. Marker coordinates are stored in this image's pixel space. */
@Entity
@Table(name = "game_maps")
public class GameMap extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false, updatable = false)
    private Long campaignId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "content_type", nullable = false)
    private String contentType;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    protected GameMap() {
    }

    public GameMap(Long campaignId, String name, String description, String storageKey, String contentType,
                   int width, int height) {
        this.campaignId = campaignId;
        this.name = name;
        this.description = description;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.width = width;
        this.height = height;
    }

    public Long getId() {
        return id;
    }

    public Long getCampaignId() {
        return campaignId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getContentType() {
        return contentType;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }
}
