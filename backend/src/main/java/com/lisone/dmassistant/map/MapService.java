package com.lisone.dmassistant.map;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.campaign.CampaignMember;
import com.lisone.dmassistant.common.AfterCommit;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.marker.MarkerRepository;
import com.lisone.dmassistant.marker.MarkerVisibility;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

@Service
public class MapService {

    static final int MAX_DIMENSION = 30_000;

    private final GameMapRepository maps;
    private final MarkerRepository markers;
    private final MapStorage storage;
    private final CampaignAccess access;

    public MapService(GameMapRepository maps, MarkerRepository markers, MapStorage storage, CampaignAccess access) {
        this.maps = maps;
        this.markers = markers;
        this.storage = storage;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<MapDtos.MapResponse> list(Long campaignId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        boolean master = membership.getRole().canManageWorld();
        return maps.findAllByCampaignIdOrderByCreatedAtAsc(campaignId).stream()
                .map(map -> MapDtos.MapResponse.from(map, countMarkers(map.getId(), master)))
                .toList();
    }

    @Transactional(readOnly = true)
    public MapDtos.MapResponse get(Long campaignId, Long mapId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        GameMap map = requireMap(campaignId, mapId);
        return MapDtos.MapResponse.from(map, countMarkers(mapId, membership.getRole().canManageWorld()));
    }

    /**
     * Stores an uploaded map image. Width/height from the client are only used when the JDK
     * can't read the format's header itself (WebP).
     */
    @Transactional
    public MapDtos.MapResponse upload(Long campaignId, String name, String description, MultipartFile file,
                                      Integer clientWidth, Integer clientHeight, AppUser me) {
        access.requireMaster(campaignId, me);
        if (!StringUtils.hasText(name) || name.trim().length() > 120) {
            throw ApiException.badRequest("Map name is required (max 120 characters)");
        }
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Map image is required");
        }
        try {
            ImageInspector.ImageFormat format = ImageInspector.detectFormat(readHead(file))
                    .orElseThrow(() -> ApiException.badRequest("Only PNG, JPEG, GIF or WebP images are supported"));
            ImageInspector.Dimensions dims;
            try (InputStream in = file.getInputStream()) {
                dims = ImageInspector.readDimensions(in).orElse(null);
            }
            if (dims == null) {
                if (clientWidth == null || clientHeight == null) {
                    throw ApiException.badRequest("Image width and height are required for this format");
                }
                dims = new ImageInspector.Dimensions(clientWidth, clientHeight);
            }
            if (dims.width() < 1 || dims.height() < 1 || dims.width() > MAX_DIMENSION || dims.height() > MAX_DIMENSION) {
                throw ApiException.badRequest("Image dimensions must be between 1 and " + MAX_DIMENSION + " pixels");
            }

            String key = UUID.randomUUID() + "." + format.extension;
            try (InputStream in = file.getInputStream()) {
                storage.store(key, in);
            }
            AfterCommit.onRollback(() -> storage.deleteQuietly(key));
            GameMap map = maps.save(new GameMap(campaignId, name.trim(), blankToNull(description), key,
                    format.contentType, dims.width(), dims.height()));
            return MapDtos.MapResponse.from(map, 0);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store map image", e);
        }
    }

    @Transactional
    public MapDtos.MapResponse update(Long campaignId, Long mapId, MapDtos.MapUpdateRequest request, AppUser me) {
        access.requireMaster(campaignId, me);
        GameMap map = requireMap(campaignId, mapId);
        map.setName(request.name().trim());
        map.setDescription(blankToNull(request.description()));
        return MapDtos.MapResponse.from(map, countMarkers(mapId, true));
    }

    @Transactional
    public void delete(Long campaignId, Long mapId, AppUser me) {
        access.requireMaster(campaignId, me);
        GameMap map = requireMap(campaignId, mapId);
        String key = map.getStorageKey();
        maps.delete(map);
        AfterCommit.run(() -> storage.deleteQuietly(key));
    }

    @Transactional(readOnly = true)
    public MapImage image(Long campaignId, Long mapId, AppUser me) {
        access.requireMember(campaignId, me);
        GameMap map = requireMap(campaignId, mapId);
        return new MapImage(storage.load(map.getStorageKey()), map.getContentType(), map.getStorageKey());
    }

    /** Used by other features (markers) that are nested under a map. */
    public GameMap requireMap(Long campaignId, Long mapId) {
        return maps.findByIdAndCampaignId(mapId, campaignId).orElseThrow(() -> ApiException.notFound("Map"));
    }

    private long countMarkers(Long mapId, boolean includeHidden) {
        return includeHidden ? markers.countByMapId(mapId)
                : markers.countByMapIdAndVisibility(mapId, MarkerVisibility.VISIBLE);
    }

    private static byte[] readHead(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(16);
        }
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    public record MapImage(Resource resource, String contentType, String etag) {
    }
}
