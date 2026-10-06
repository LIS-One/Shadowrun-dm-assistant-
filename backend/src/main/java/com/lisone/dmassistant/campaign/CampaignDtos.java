package com.lisone.dmassistant.campaign;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class CampaignDtos {

    private CampaignDtos() {
    }

    public record CampaignRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 5000) String description) {
    }

    public record JoinRequest(@NotBlank @Size(max = 32) String inviteCode) {
    }

    public record RoleChangeRequest(@NotNull CampaignRole role) {
    }

    public record CampaignResponse(
            Long id,
            String name,
            String description,
            CampaignRole myRole,
            String inviteCode,
            long memberCount,
            Instant createdAt) {

        static CampaignResponse from(Campaign campaign, CampaignRole myRole, long memberCount) {
            // Players don't need the invite code; owners and masters hand it out.
            String code = myRole.canManageWorld() ? campaign.getInviteCode() : null;
            return new CampaignResponse(campaign.getId(), campaign.getName(), campaign.getDescription(), myRole,
                    code, memberCount, campaign.getCreatedAt());
        }
    }

    public record MemberResponse(
            Long id,
            Long userId,
            String displayName,
            String avatarUrl,
            CampaignRole role,
            Instant joinedAt) {

        static MemberResponse from(CampaignMember member) {
            return new MemberResponse(member.getId(), member.getUser().getId(), member.getUser().getDisplayName(),
                    member.getUser().getAvatarUrl(), member.getRole(), member.getJoinedAt());
        }
    }
}
