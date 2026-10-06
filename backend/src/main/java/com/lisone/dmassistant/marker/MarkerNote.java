package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A personal note pinned to a marker; readable by its author only. */
@Entity
@Table(name = "marker_notes")
public class MarkerNote extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "marker_id", nullable = false, updatable = false)
    private Long markerId;

    @Column(name = "author_id", nullable = false, updatable = false)
    private Long authorId;

    @Column(nullable = false)
    private String content;

    protected MarkerNote() {
    }

    public MarkerNote(Long markerId, Long authorId, String content) {
        this.markerId = markerId;
        this.authorId = authorId;
        this.content = content;
    }

    public Long getId() {
        return id;
    }

    public Long getMarkerId() {
        return markerId;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
