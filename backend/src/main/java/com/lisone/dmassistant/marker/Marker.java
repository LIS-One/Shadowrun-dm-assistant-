package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A point of interest on a map, positioned in the map image's pixel coordinates. */
@Entity
@Table(name = "markers")
public class Marker extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "map_id", nullable = false, updatable = false)
    private Long mapId;

    @Column(name = "marker_type_id", nullable = false)
    private Long markerTypeId;

    @Column(nullable = false)
    private String title;

    /** What players see once the marker is visible. */
    private String description;

    /** Secret notes that are never sent to players. */
    @Column(name = "gm_notes")
    private String gmNotes;

    @Column(name = "pos_x", nullable = false)
    private double x;

    @Column(name = "pos_y", nullable = false)
    private double y;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarkerVisibility visibility;

    protected Marker() {
    }

    public Marker(Long mapId) {
        this.mapId = mapId;
    }

    public boolean isVisibleToPlayers() {
        return visibility == MarkerVisibility.VISIBLE;
    }

    public Long getId() {
        return id;
    }

    public Long getMapId() {
        return mapId;
    }

    public Long getMarkerTypeId() {
        return markerTypeId;
    }

    public void setMarkerTypeId(Long markerTypeId) {
        this.markerTypeId = markerTypeId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGmNotes() {
        return gmNotes;
    }

    public void setGmNotes(String gmNotes) {
        this.gmNotes = gmNotes;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public MarkerVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(MarkerVisibility visibility) {
        this.visibility = visibility;
    }
}
