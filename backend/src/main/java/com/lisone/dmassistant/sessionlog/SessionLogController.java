package com.lisone.dmassistant.sessionlog;

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
@RequestMapping("/api/campaigns/{campaignId}/session-logs")
public class SessionLogController {

    private final SessionLogService sessionLogService;

    public SessionLogController(SessionLogService sessionLogService) {
        this.sessionLogService = sessionLogService;
    }

    @GetMapping
    public List<SessionLogDtos.SessionLogResponse> list(AppUser me, @PathVariable Long campaignId) {
        return sessionLogService.list(campaignId, me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionLogDtos.SessionLogResponse create(AppUser me, @PathVariable Long campaignId,
                                                    @Valid @RequestBody SessionLogDtos.SessionLogRequest request) {
        return sessionLogService.create(campaignId, request, me);
    }

    @GetMapping("/{logId}")
    public SessionLogDtos.SessionLogResponse get(AppUser me, @PathVariable Long campaignId, @PathVariable Long logId) {
        return sessionLogService.get(campaignId, logId, me);
    }

    @PutMapping("/{logId}")
    public SessionLogDtos.SessionLogResponse update(AppUser me, @PathVariable Long campaignId,
                                                    @PathVariable Long logId,
                                                    @Valid @RequestBody SessionLogDtos.SessionLogRequest request) {
        return sessionLogService.update(campaignId, logId, request, me);
    }

    @DeleteMapping("/{logId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(AppUser me, @PathVariable Long campaignId, @PathVariable Long logId) {
        sessionLogService.delete(campaignId, logId, me);
    }
}
