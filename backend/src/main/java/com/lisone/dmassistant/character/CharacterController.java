package com.lisone.dmassistant.character;

import com.lisone.dmassistant.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/characters")
public class CharacterController {

    private final CharacterService characterService;
    private final CharacterNoteService noteService;

    public CharacterController(CharacterService characterService, CharacterNoteService noteService) {
        this.characterService = characterService;
        this.noteService = noteService;
    }

    @GetMapping
    public List<CharacterDtos.CharacterSummary> list(AppUser me, @PathVariable Long campaignId) {
        return characterService.list(campaignId, me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CharacterDtos.CharacterResponse create(AppUser me, @PathVariable Long campaignId,
                                                  @Valid @RequestBody CharacterDtos.CharacterRequest request) {
        return characterService.create(campaignId, request, me);
    }

    @GetMapping("/{characterId}")
    public CharacterDtos.CharacterResponse get(AppUser me, @PathVariable Long campaignId,
                                               @PathVariable Long characterId) {
        return characterService.get(campaignId, characterId, me);
    }

    @PutMapping("/{characterId}")
    public CharacterDtos.CharacterResponse update(AppUser me, @PathVariable Long campaignId,
                                                  @PathVariable Long characterId,
                                                  @Valid @RequestBody CharacterDtos.CharacterRequest request) {
        return characterService.update(campaignId, characterId, request, me);
    }

    @DeleteMapping("/{characterId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(AppUser me, @PathVariable Long campaignId, @PathVariable Long characterId) {
        characterService.delete(campaignId, characterId, me);
    }

    @GetMapping("/{characterId}/notes")
    public List<CharacterDtos.NoteResponse> notes(AppUser me, @PathVariable Long campaignId,
                                                  @PathVariable Long characterId) {
        return noteService.list(campaignId, characterId, me);
    }

    @PostMapping("/{characterId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public CharacterDtos.NoteResponse createNote(AppUser me, @PathVariable Long campaignId,
                                                 @PathVariable Long characterId,
                                                 @Valid @RequestBody CharacterDtos.NoteRequest request) {
        return noteService.create(campaignId, characterId, request, me);
    }

    @PutMapping("/{characterId}/notes/{noteId}")
    public CharacterDtos.NoteResponse updateNote(AppUser me, @PathVariable Long campaignId,
                                                 @PathVariable Long characterId, @PathVariable Long noteId,
                                                 @Valid @RequestBody CharacterDtos.NoteRequest request) {
        return noteService.update(campaignId, characterId, noteId, request, me);
    }

    @DeleteMapping("/{characterId}/notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(AppUser me, @PathVariable Long campaignId, @PathVariable Long characterId,
                           @PathVariable Long noteId) {
        noteService.delete(campaignId, characterId, noteId, me);
    }
}
