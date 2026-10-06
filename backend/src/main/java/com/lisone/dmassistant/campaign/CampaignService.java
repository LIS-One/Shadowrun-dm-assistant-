package com.lisone.dmassistant.campaign;

import com.lisone.dmassistant.common.AfterCommit;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.map.GameMapRepository;
import com.lisone.dmassistant.map.MapStorage;
import com.lisone.dmassistant.user.AppUser;
import com.lisone.dmassistant.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;

@Service
public class CampaignService {

    private static final String INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int INVITE_LENGTH = 10;

    private final SecureRandom random = new SecureRandom();
    private final CampaignRepository campaigns;
    private final CampaignMemberRepository members;
    private final AppUserRepository users;
    private final CampaignAccess access;
    private final GameMapRepository maps;
    private final MapStorage mapStorage;

    public CampaignService(CampaignRepository campaigns, CampaignMemberRepository members, AppUserRepository users,
                           CampaignAccess access, GameMapRepository maps, MapStorage mapStorage) {
        this.campaigns = campaigns;
        this.members = members;
        this.users = users;
        this.access = access;
        this.maps = maps;
        this.mapStorage = mapStorage;
    }

    @Transactional(readOnly = true)
    public List<CampaignDtos.CampaignResponse> listMine(AppUser me) {
        return members.findAllByUserId(me.getId()).stream()
                .map(m -> CampaignDtos.CampaignResponse.from(m.getCampaign(), m.getRole(),
                        members.countByCampaignId(m.getCampaign().getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignDtos.CampaignResponse get(Long campaignId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        return CampaignDtos.CampaignResponse.from(membership.getCampaign(), membership.getRole(),
                members.countByCampaignId(campaignId));
    }

    @Transactional
    public CampaignDtos.CampaignResponse create(CampaignDtos.CampaignRequest request, AppUser me) {
        Campaign campaign = campaigns.save(new Campaign(request.name().trim(), blankToNull(request.description()),
                newInviteCode()));
        members.save(new CampaignMember(campaign, users.getReferenceById(me.getId()), CampaignRole.OWNER));
        return CampaignDtos.CampaignResponse.from(campaign, CampaignRole.OWNER, 1);
    }

    @Transactional
    public CampaignDtos.CampaignResponse update(Long campaignId, CampaignDtos.CampaignRequest request, AppUser me) {
        CampaignMember membership = access.requireOwner(campaignId, me);
        Campaign campaign = membership.getCampaign();
        campaign.setName(request.name().trim());
        campaign.setDescription(blankToNull(request.description()));
        return CampaignDtos.CampaignResponse.from(campaign, membership.getRole(),
                members.countByCampaignId(campaignId));
    }

    @Transactional
    public void delete(Long campaignId, AppUser me) {
        access.requireOwner(campaignId, me);
        List<String> storageKeys = maps.findStorageKeysByCampaignId(campaignId);
        campaigns.deleteCampaign(campaignId);
        AfterCommit.run(() -> storageKeys.forEach(mapStorage::deleteQuietly));
    }

    @Transactional
    public CampaignDtos.CampaignResponse join(CampaignDtos.JoinRequest request, AppUser me) {
        String code = request.inviteCode().trim().toUpperCase(Locale.ROOT);
        Campaign campaign = campaigns.findByInviteCode(code)
                .orElseThrow(() -> ApiException.notFound("Campaign with this invite code"));
        CampaignMember membership = members.findMembership(campaign.getId(), me.getId())
                .orElseGet(() -> members.save(
                        new CampaignMember(campaign, users.getReferenceById(me.getId()), CampaignRole.PLAYER)));
        return CampaignDtos.CampaignResponse.from(campaign, membership.getRole(),
                members.countByCampaignId(campaign.getId()));
    }

    @Transactional
    public CampaignDtos.CampaignResponse regenerateInviteCode(Long campaignId, AppUser me) {
        CampaignMember membership = access.requireOwner(campaignId, me);
        membership.getCampaign().setInviteCode(newInviteCode());
        return CampaignDtos.CampaignResponse.from(membership.getCampaign(), membership.getRole(),
                members.countByCampaignId(campaignId));
    }

    @Transactional(readOnly = true)
    public List<CampaignDtos.MemberResponse> listMembers(Long campaignId, AppUser me) {
        access.requireMember(campaignId, me);
        return members.findAllByCampaignId(campaignId).stream().map(CampaignDtos.MemberResponse::from).toList();
    }

    @Transactional
    public CampaignDtos.MemberResponse changeRole(Long campaignId, Long memberId, CampaignRole role, AppUser me) {
        access.requireOwner(campaignId, me);
        CampaignMember target = members.findByIdAndCampaignId(memberId, campaignId)
                .orElseThrow(() -> ApiException.notFound("Member"));
        if (target.getRole() == CampaignRole.OWNER && role != CampaignRole.OWNER) {
            ensureAnotherOwnerRemains(campaignId);
        }
        target.setRole(role);
        return CampaignDtos.MemberResponse.from(target);
    }

    /** Owners can remove anyone; everybody else can only remove themselves (leave the campaign). */
    @Transactional
    public void removeMember(Long campaignId, Long memberId, AppUser me) {
        CampaignMember myMembership = access.requireMember(campaignId, me);
        CampaignMember target = members.findByIdAndCampaignId(memberId, campaignId)
                .orElseThrow(() -> ApiException.notFound("Member"));
        boolean leavingMyself = target.getId().equals(myMembership.getId());
        if (!leavingMyself && !myMembership.getRole().canManageMembers()) {
            throw ApiException.forbidden("Only the campaign owner can remove members");
        }
        if (target.getRole() == CampaignRole.OWNER) {
            ensureAnotherOwnerRemains(campaignId);
        }
        members.delete(target);
    }

    private void ensureAnotherOwnerRemains(Long campaignId) {
        if (members.countByCampaignIdAndRole(campaignId, CampaignRole.OWNER) <= 1) {
            throw ApiException.conflict("A campaign must keep at least one owner");
        }
    }

    private String newInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(INVITE_LENGTH);
            for (int i = 0; i < INVITE_LENGTH; i++) {
                sb.append(INVITE_ALPHABET.charAt(random.nextInt(INVITE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (campaigns.existsByInviteCode(code));
        return code;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
