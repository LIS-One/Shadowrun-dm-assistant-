package com.lisone.dmassistant.marker;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;

@Service
public class MarkerTypeService {

    private final MarkerTypeRepository types;
    private final MarkerRepository markers;
    private final CampaignAccess access;

    public MarkerTypeService(MarkerTypeRepository types, MarkerRepository markers, CampaignAccess access) {
        this.types = types;
        this.markers = markers;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<MarkerDtos.MarkerTypeResponse> list(Long campaignId, AppUser me) {
        access.requireMember(campaignId, me);
        return types.findAvailable(campaignId).stream().map(MarkerDtos.MarkerTypeResponse::from).toList();
    }

    @Transactional
    public MarkerDtos.MarkerTypeResponse create(Long campaignId, MarkerDtos.MarkerTypeRequest request, AppUser me) {
        access.requireMaster(campaignId, me);
        MarkerType type = new MarkerType(campaignId, request.name().trim(), request.shape(), normalizeColor(request.color()),
                blankToNull(request.icon()), request.sortOrder() == null ? 1000 : request.sortOrder());
        return MarkerDtos.MarkerTypeResponse.from(types.save(type));
    }

    @Transactional
    public MarkerDtos.MarkerTypeResponse update(Long campaignId, Long typeId, MarkerDtos.MarkerTypeRequest request,
                                                AppUser me) {
        access.requireMaster(campaignId, me);
        MarkerType type = requireCustomType(campaignId, typeId);
        type.setName(request.name().trim());
        type.setShape(request.shape());
        type.setColor(normalizeColor(request.color()));
        type.setIcon(blankToNull(request.icon()));
        if (request.sortOrder() != null) {
            type.setSortOrder(request.sortOrder());
        }
        return MarkerDtos.MarkerTypeResponse.from(type);
    }

    @Transactional
    public void delete(Long campaignId, Long typeId, AppUser me) {
        access.requireMaster(campaignId, me);
        MarkerType type = requireCustomType(campaignId, typeId);
        if (markers.existsByMarkerTypeId(typeId)) {
            throw ApiException.conflict("This marker type is still used by markers; change them first");
        }
        types.delete(type);
    }

    /** Built-in types are shared by every campaign, so only campaign-specific ones are editable. */
    private MarkerType requireCustomType(Long campaignId, Long typeId) {
        return types.findByIdAndCampaignId(typeId, campaignId)
                .orElseThrow(() -> ApiException.notFound("Custom marker type"));
    }

    private static String normalizeColor(String color) {
        return color.toUpperCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
