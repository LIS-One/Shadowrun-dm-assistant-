package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.campaign.CampaignMember;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.map.MapService;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Personal marker notes. Every member (players, masters, owners) can keep them, and nobody but the
 * author can read them. A note disappears from view while its marker is hidden from the author.
 */
@Service
public class MarkerNoteService {

    private static final List<MarkerVisibility> PLAYER_VISIBLE = List.of(MarkerVisibility.VISIBLE);
    private static final List<MarkerVisibility> ALL = List.of(MarkerVisibility.values());

    private final MarkerNoteRepository notes;
    private final MarkerRepository markers;
    private final MapService mapService;
    private final CampaignAccess access;

    public MarkerNoteService(MarkerNoteRepository notes, MarkerRepository markers, MapService mapService,
                             CampaignAccess access) {
        this.notes = notes;
        this.markers = markers;
        this.mapService = mapService;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<MarkerDtos.NoteResponse> listMine(Long campaignId, Long mapId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        mapService.requireMap(campaignId, mapId);
        return notes.findMine(mapId, me.getId(), visibleTo(membership)).stream()
                .map(MarkerDtos.NoteResponse::from).toList();
    }

    @Transactional
    public MarkerDtos.NoteResponse create(Long campaignId, Long mapId, Long markerId, MarkerDtos.NoteRequest request,
                                          AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        mapService.requireMap(campaignId, mapId);
        Marker marker = markers.findByIdAndMapId(markerId, mapId)
                .filter(m -> membership.getRole().canManageWorld() || m.isVisibleToPlayers())
                .orElseThrow(() -> ApiException.notFound("Marker"));
        return MarkerDtos.NoteResponse.from(notes.save(new MarkerNote(marker.getId(), me.getId(),
                request.content().trim())));
    }

    @Transactional
    public MarkerDtos.NoteResponse update(Long campaignId, Long noteId, MarkerDtos.NoteRequest request, AppUser me) {
        MarkerNote note = requireMine(campaignId, noteId, me);
        note.setContent(request.content().trim());
        return MarkerDtos.NoteResponse.from(note);
    }

    @Transactional
    public void delete(Long campaignId, Long noteId, AppUser me) {
        notes.delete(requireMine(campaignId, noteId, me));
    }

    private MarkerNote requireMine(Long campaignId, Long noteId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        return notes.findMine(noteId, me.getId(), campaignId, visibleTo(membership))
                .orElseThrow(() -> ApiException.notFound("Note"));
    }

    private static List<MarkerVisibility> visibleTo(CampaignMember membership) {
        return membership.getRole().canManageWorld() ? ALL : PLAYER_VISIBLE;
    }
}
