package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns/{campaignId}")
public class MarkerController {

    private final MarkerTypeService markerTypeService;
    private final MarkerService markerService;
    private final MarkerNoteService markerNoteService;

    public MarkerController(MarkerTypeService markerTypeService, MarkerService markerService,
                            MarkerNoteService markerNoteService) {
        this.markerTypeService = markerTypeService;
        this.markerService = markerService;
        this.markerNoteService = markerNoteService;
    }

    // --- marker type catalogue ---

    @GetMapping("/marker-types")
    public List<MarkerDtos.MarkerTypeResponse> listTypes(AppUser me, @PathVariable Long campaignId) {
        return markerTypeService.list(campaignId, me);
    }

    @PostMapping("/marker-types")
    @ResponseStatus(HttpStatus.CREATED)
    public MarkerDtos.MarkerTypeResponse createType(AppUser me, @PathVariable Long campaignId,
                                                    @Valid @RequestBody MarkerDtos.MarkerTypeRequest request) {
        return markerTypeService.create(campaignId, request, me);
    }

    @PutMapping("/marker-types/{typeId}")
    public MarkerDtos.MarkerTypeResponse updateType(AppUser me, @PathVariable Long campaignId, @PathVariable Long typeId,
                                                    @Valid @RequestBody MarkerDtos.MarkerTypeRequest request) {
        return markerTypeService.update(campaignId, typeId, request, me);
    }

    @DeleteMapping("/marker-types/{typeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteType(AppUser me, @PathVariable Long campaignId, @PathVariable Long typeId) {
        markerTypeService.delete(campaignId, typeId, me);
    }

    // --- markers ---

    @GetMapping("/maps/{mapId}/markers")
    public List<MarkerDtos.MarkerResponse> listMarkers(AppUser me, @PathVariable Long campaignId,
                                                       @PathVariable Long mapId) {
        return markerService.list(campaignId, mapId, me);
    }

    @PostMapping("/maps/{mapId}/markers")
    @ResponseStatus(HttpStatus.CREATED)
    public MarkerDtos.MarkerResponse createMarker(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId,
                                                  @Valid @RequestBody MarkerDtos.MarkerRequest request) {
        return markerService.create(campaignId, mapId, request, me);
    }

    @PutMapping("/maps/{mapId}/markers/{markerId}")
    public MarkerDtos.MarkerResponse updateMarker(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId,
                                                  @PathVariable Long markerId,
                                                  @Valid @RequestBody MarkerDtos.MarkerRequest request) {
        return markerService.update(campaignId, mapId, markerId, request, me);
    }

    @PatchMapping("/maps/{mapId}/markers/{markerId}/visibility")
    public MarkerDtos.MarkerResponse changeVisibility(AppUser me, @PathVariable Long campaignId,
                                                      @PathVariable Long mapId, @PathVariable Long markerId,
                                                      @Valid @RequestBody MarkerDtos.VisibilityRequest request) {
        return markerService.changeVisibility(campaignId, mapId, markerId, request.visibility(), me);
    }

    @DeleteMapping("/maps/{mapId}/markers/{markerId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMarker(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId,
                             @PathVariable Long markerId) {
        markerService.delete(campaignId, mapId, markerId, me);
    }

    // --- personal notes on markers ---

    @GetMapping("/maps/{mapId}/my-notes")
    public List<MarkerDtos.NoteResponse> myNotes(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId) {
        return markerNoteService.listMine(campaignId, mapId, me);
    }

    @PostMapping("/maps/{mapId}/markers/{markerId}/my-notes")
    @ResponseStatus(HttpStatus.CREATED)
    public MarkerDtos.NoteResponse createNote(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId,
                                              @PathVariable Long markerId,
                                              @Valid @RequestBody MarkerDtos.NoteRequest request) {
        return markerNoteService.create(campaignId, mapId, markerId, request, me);
    }

    @PutMapping("/my-notes/{noteId}")
    public MarkerDtos.NoteResponse updateNote(AppUser me, @PathVariable Long campaignId, @PathVariable Long noteId,
                                              @Valid @RequestBody MarkerDtos.NoteRequest request) {
        return markerNoteService.update(campaignId, noteId, request, me);
    }

    @DeleteMapping("/my-notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(AppUser me, @PathVariable Long campaignId, @PathVariable Long noteId) {
        markerNoteService.delete(campaignId, noteId, me);
    }
}
