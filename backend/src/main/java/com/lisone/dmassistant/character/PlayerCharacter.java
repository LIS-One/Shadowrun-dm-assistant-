package com.lisone.dmassistant.character;

import com.lisone.dmassistant.common.AuditedEntity;
import com.lisone.dmassistant.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A Shadowrun character. The sheet itself is free-form JSON so it can follow the frontend form
 * (and future editions) without a migration for every new field.
 */
@Entity
@Table(name = "characters")
public class PlayerCharacter extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false, updatable = false)
    private Long campaignId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", updatable = false)
    private AppUser owner;

    @Column(nullable = false)
    private String name;

    @Column(name = "sheet_json", nullable = false)
    private String sheetJson;

    protected PlayerCharacter() {
    }

    public PlayerCharacter(Long campaignId, AppUser owner) {
        this.campaignId = campaignId;
        this.owner = owner;
    }

    public Long getId() {
        return id;
    }

    public Long getCampaignId() {
        return campaignId;
    }

    public AppUser getOwner() {
        return owner;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSheetJson() {
        return sheetJson;
    }

    public void setSheetJson(String sheetJson) {
        this.sheetJson = sheetJson;
    }
}
