package com.lisone.dmassistant.character;

import com.lisone.dmassistant.common.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The player's private journal entries for one of their characters. */
@Entity
@Table(name = "character_notes")
public class CharacterNote extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "character_id", nullable = false, updatable = false)
    private Long characterId;

    @Column(nullable = false)
    private String title;

    private String content;

    protected CharacterNote() {
    }

    public CharacterNote(Long characterId, String title, String content) {
        this.characterId = characterId;
        this.title = title;
        this.content = content;
    }

    public Long getId() {
        return id;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
