package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.campaign.CampaignMember;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.map.GameMap;
import com.lisone.dmassistant.map.MapService;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class MarkerService {

    private final MarkerRepository markers;
    private final MarkerTypeRepository types;
    private final MapService mapService;
    private final CampaignAccess access;

    public MarkerService(MarkerRepository markers, MarkerTypeRepository types, MapService mapService,
                         CampaignAccess access) {
        this.markers = markers;
        this.types = types;
        this.mapService = mapService;
        this.access = access;
    }

    /** Masters get every marker with secret notes; players only revealed markers without them. */
    @Transactional(readOnly = true)
    public List<MarkerDtos.MarkerResponse> list(Long campaignId, Long mapId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        mapService.requireMap(campaignId, mapId);
        if (membership.getRole().canManageWorld()) {
            return markers.findAllByMapIdOrderByIdAsc(mapId).stream()
                    .map(MarkerDtos.MarkerResponse::forMaster).toList();
        }
        return markers.findAllByMapIdAndVisibilityOrderByIdAsc(mapId, MarkerVisibility.VISIBLE).stream()
                .map(MarkerDtos.MarkerResponse::forPlayer).toList();
    }

    @Transactional
    public MarkerDtos.MarkerResponse create(Long campaignId, Long mapId, MarkerDtos.MarkerRequest request, AppUser me) {
        access.requireMaster(campaignId, me);
        GameMap map = mapService.requireMap(campaignId, mapId);
        Marker marker = new Marker(mapId);
        apply(marker, request, map, campaignId);
        return MarkerDtos.MarkerResponse.forMaster(markers.save(marker));
    }

    @Transactional
    public MarkerDtos.MarkerResponse update(Long campaignId, Long mapId, Long markerId,
                                            MarkerDtos.MarkerRequest request, AppUser me) {
        access.requireMaster(campaignId, me);
        GameMap map = mapService.requireMap(campaignId, mapId);
        Marker marker = requireMarker(mapId, markerId);
        apply(marker, request, map, campaignId);
        return MarkerDtos.MarkerResponse.forMaster(marker);
    }

    @Transactional
    public MarkerDtos.MarkerResponse changeVisibility(Long campaignId, Long mapId, Long markerId,
                                                      MarkerVisibility visibility, AppUser me) {
        access.requireMaster(campaignId, me);
        mapService.requireMap(campaignId, mapId);
        Marker marker = requireMarker(mapId, markerId);
        marker.setVisibility(visibility);
        return MarkerDtos.MarkerResponse.forMaster(marker);
    }

    @Transactional
    public void delete(Long campaignId, Long mapId, Long markerId, AppUser me) {
        access.requireMaster(campaignId, me);
        mapService.requireMap(campaignId, mapId);
        markers.delete(requireMarker(mapId, markerId));
    }

    private void apply(Marker marker, MarkerDtos.MarkerRequest request, GameMap map, Long campaignId) {
        types.findAvailable(request.typeId(), campaignId)
                .orElseThrow(() -> ApiException.badRequest("Unknown marker type"));
        if (request.x() < 0 || request.y() < 0 || request.x() > map.getWidth() || request.y() > map.getHeight()) {
            throw ApiException.badRequest("Marker position is outside of the map");
        }
        marker.setMarkerTypeId(request.typeId());
        marker.setTitle(request.title().trim());
        marker.setDescription(blankToNull(request.description()));
        marker.setGmNotes(blankToNull(request.gmNotes()));
        marker.setX(request.x());
        marker.setY(request.y());
        if (request.visibility() != null) {
            marker.setVisibility(request.visibility());
        } else if (marker.getVisibility() == null) {
            // New markers default to visible; an update without the field never reveals a hidden marker.
            marker.setVisibility(MarkerVisibility.VISIBLE);
        }
    }

    private Marker requireMarker(Long mapId, Long markerId) {
        return markers.findByIdAndMapId(markerId, mapId).orElseThrow(() -> ApiException.notFound("Marker"));
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
