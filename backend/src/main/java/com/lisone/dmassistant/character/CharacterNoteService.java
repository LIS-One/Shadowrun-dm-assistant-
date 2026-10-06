package com.lisone.dmassistant.character;

import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/** Character notes are a private journal: only the character's player can read or write them. */
@Service
public class CharacterNoteService {

    private final CharacterNoteRepository notes;
    private final CharacterService characterService;

    public CharacterNoteService(CharacterNoteRepository notes, CharacterService characterService) {
        this.notes = notes;
        this.characterService = characterService;
    }

    @Transactional(readOnly = true)
    public List<CharacterDtos.NoteResponse> list(Long campaignId, Long characterId, AppUser me) {
        characterService.requireOwned(campaignId, characterId, me);
        return notes.findAllByCharacterIdOrderByUpdatedAtDesc(characterId).stream()
                .map(CharacterDtos.NoteResponse::from).toList();
    }

    @Transactional
    public CharacterDtos.NoteResponse create(Long campaignId, Long characterId, CharacterDtos.NoteRequest request,
                                             AppUser me) {
        characterService.requireOwned(campaignId, characterId, me);
        CharacterNote note = new CharacterNote(characterId, request.title().trim(), blankToNull(request.content()));
        return CharacterDtos.NoteResponse.from(notes.save(note));
    }

    @Transactional
    public CharacterDtos.NoteResponse update(Long campaignId, Long characterId, Long noteId,
                                             CharacterDtos.NoteRequest request, AppUser me) {
        CharacterNote note = requireNote(campaignId, characterId, noteId, me);
        note.setTitle(request.title().trim());
        note.setContent(blankToNull(request.content()));
        return CharacterDtos.NoteResponse.from(note);
    }

    @Transactional
    public void delete(Long campaignId, Long characterId, Long noteId, AppUser me) {
        notes.delete(requireNote(campaignId, characterId, noteId, me));
    }

    private CharacterNote requireNote(Long campaignId, Long characterId, Long noteId, AppUser me) {
        characterService.requireOwned(campaignId, characterId, me);
        return notes.findByIdAndCharacterId(noteId, characterId).orElseThrow(() -> ApiException.notFound("Note"));
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }
}
