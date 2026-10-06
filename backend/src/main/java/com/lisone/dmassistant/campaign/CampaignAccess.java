package com.lisone.dmassistant.campaign;

import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.user.AppUser;
import org.springframework.stereotype.Component;

/**
 * Single place that turns "user X wants to touch campaign Y" into a membership or an error.
 * Non-members get 404 rather than 403 so campaign ids don't leak.
 */
@Component
public class CampaignAccess {

    private final CampaignMemberRepository members;

    public CampaignAccess(CampaignMemberRepository members) {
        this.members = members;
    }

    public CampaignMember requireMember(Long campaignId, AppUser user) {
        return members.findMembership(campaignId, user.getId())
                .orElseThrow(() -> ApiException.notFound("Campaign"));
    }

    public CampaignMember requireMaster(Long campaignId, AppUser user) {
        CampaignMember membership = requireMember(campaignId, user);
        if (!membership.getRole().canManageWorld()) {
            throw ApiException.forbidden("Only the game master or owner can do this");
        }
        return membership;
    }

    public CampaignMember requireOwner(Long campaignId, AppUser user) {
        CampaignMember membership = requireMember(campaignId, user);
        if (!membership.getRole().canManageMembers()) {
            throw ApiException.forbidden("Only the campaign owner can do this");
        }
        return membership;
    }
}
