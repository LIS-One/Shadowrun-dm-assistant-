package com.lisone.dmassistant.map;

import com.lisone.dmassistant.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/campaigns/{campaignId}/maps")
public class MapController {

    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping
    public List<MapDtos.MapResponse> list(AppUser me, @PathVariable Long campaignId) {
        return mapService.list(campaignId, me);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MapDtos.MapResponse upload(AppUser me, @PathVariable Long campaignId,
                                      @RequestParam("name") String name,
                                      @RequestParam(value = "description", required = false) String description,
                                      @RequestParam(value = "width", required = false) Integer width,
                                      @RequestParam(value = "height", required = false) Integer height,
                                      @RequestPart("file") MultipartFile file) {
        return mapService.upload(campaignId, name, description, file, width, height, me);
    }

    @GetMapping("/{mapId}")
    public MapDtos.MapResponse get(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId) {
        return mapService.get(campaignId, mapId, me);
    }

    @PutMapping("/{mapId}")
    public MapDtos.MapResponse update(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId,
                                      @Valid @RequestBody MapDtos.MapUpdateRequest request) {
        return mapService.update(campaignId, mapId, request, me);
    }

    @DeleteMapping("/{mapId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId) {
        mapService.delete(campaignId, mapId, me);
    }

    @GetMapping("/{mapId}/image")
    public ResponseEntity<Resource> image(AppUser me, @PathVariable Long campaignId, @PathVariable Long mapId) {
        MapService.MapImage image = mapService.image(campaignId, mapId, me);
        // Storage keys are immutable, so the browser may cache the image for a long time.
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .eTag(image.etag())
                .header("X-Content-Type-Options", "nosniff")
                .body(image.resource());
    }
}
