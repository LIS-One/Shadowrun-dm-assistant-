package com.lisone.dmassistant.marker;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A kind of location (shape + color + icon). Built-in types have no campaign. */
@Entity
@Table(name = "marker_types")
public class MarkerType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", updatable = false)
    private Long campaignId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MarkerShape shape;

    @Column(nullable = false)
    private String color;

    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected MarkerType() {
    }

    public MarkerType(Long campaignId, String name, MarkerShape shape, String color, String icon, int sortOrder) {
        this.campaignId = campaignId;
        this.name = name;
        this.shape = shape;
        this.color = color;
        this.icon = icon;
        this.sortOrder = sortOrder;
    }

    public boolean isBuiltIn() {
        return campaignId == null;
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

    public MarkerShape getShape() {
        return shape;
    }

    public void setShape(MarkerShape shape) {
        this.shape = shape;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
