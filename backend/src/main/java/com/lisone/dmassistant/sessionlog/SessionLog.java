package com.lisone.dmassistant.sessionlog;

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

import java.time.LocalDate;

/** Recap of a played session. Players see it once the master publishes it. */
@Entity
@Table(name = "session_logs")
public class SessionLog extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "campaign_id", nullable = false, updatable = false)
    private Long campaignId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private AppUser author;

    @Column(name = "session_number")
    private Integer sessionNumber;

    @Column(nullable = false)
    private String title;

    @Column(name = "played_on")
    private LocalDate playedOn;

    private String summary;

    private String content;

    @Column(nullable = false)
    private boolean published;

    protected SessionLog() {
    }

    public SessionLog(Long campaignId, AppUser author) {
        this.campaignId = campaignId;
        this.author = author;
    }

    public Long getId() {
        return id;
    }

    public Long getCampaignId() {
        return campaignId;
    }

    public AppUser getAuthor() {
        return author;
    }

    public Integer getSessionNumber() {
        return sessionNumber;
    }

    public void setSessionNumber(Integer sessionNumber) {
        this.sessionNumber = sessionNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDate getPlayedOn() {
        return playedOn;
    }

    public void setPlayedOn(LocalDate playedOn) {
        this.playedOn = playedOn;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }
}
