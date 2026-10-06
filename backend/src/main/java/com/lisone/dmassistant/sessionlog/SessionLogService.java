package com.lisone.dmassistant.sessionlog;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.campaign.CampaignMember;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.user.AppUser;
import com.lisone.dmassistant.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class SessionLogService {

    private final SessionLogRepository logs;
    private final AppUserRepository users;
    private final CampaignAccess access;

    public SessionLogService(SessionLogRepository logs, AppUserRepository users, CampaignAccess access) {
        this.logs = logs;
        this.users = users;
        this.access = access;
    }

    /** Masters also see their unpublished drafts. */
    @Transactional(readOnly = true)
    public List<SessionLogDtos.SessionLogResponse> list(Long campaignId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        List<SessionLog> found = membership.getRole().canManageWorld()
                ? logs.findAllInCampaign(campaignId)
                : logs.findPublishedInCampaign(campaignId);
        return found.stream().map(SessionLogDtos.SessionLogResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SessionLogDtos.SessionLogResponse get(Long campaignId, Long logId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        SessionLog log = logs.findInCampaign(logId, campaignId)
                .filter(l -> l.isPublished() || membership.getRole().canManageWorld())
                .orElseThrow(() -> ApiException.notFound("Session log"));
        return SessionLogDtos.SessionLogResponse.from(log);
    }

    @Transactional
    public SessionLogDtos.SessionLogResponse create(Long campaignId, SessionLogDtos.SessionLogRequest request,
                                                    AppUser me) {
        access.requireMaster(campaignId, me);
        SessionLog log = new SessionLog(campaignId, users.getReferenceById(me.getId()));
        apply(log, request);
        return SessionLogDtos.SessionLogResponse.from(logs.save(log));
    }

    @Transactional
    public SessionLogDtos.SessionLogResponse update(Long campaignId, Long logId,
                                                    SessionLogDtos.SessionLogRequest request, AppUser me) {
        access.requireMaster(campaignId, me);
        SessionLog log = logs.findInCampaign(logId, campaignId).orElseThrow(() -> ApiException.notFound("Session log"));
        apply(log, request);
        return SessionLogDtos.SessionLogResponse.from(log);
    }

    @Transactional
    public void delete(Long campaignId, Long logId, AppUser me) {
        access.requireMaster(campaignId, me);
        logs.delete(logs.findInCampaign(logId, campaignId).orElseThrow(() -> ApiException.notFound("Session log")));
    }

    private static void apply(SessionLog log, SessionLogDtos.SessionLogRequest request) {
        log.setSessionNumber(request.sessionNumber());
        log.setTitle(request.title().trim());
        log.setPlayedOn(request.playedOn());
        log.setSummary(StringUtils.hasText(request.summary()) ? request.summary().trim() : null);
        log.setContent(StringUtils.hasText(request.content()) ? request.content() : null);
        log.setPublished(request.published());
    }
}
