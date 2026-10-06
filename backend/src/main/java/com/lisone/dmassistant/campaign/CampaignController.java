package com.lisone.dmassistant.campaign;

import com.lisone.dmassistant.user.AppUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
public class CampaignController {

    private final CampaignService campaignService;

    public CampaignController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping
    public List<CampaignDtos.CampaignResponse> list(AppUser me) {
        return campaignService.listMine(me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CampaignDtos.CampaignResponse create(AppUser me, @Valid @RequestBody CampaignDtos.CampaignRequest request) {
        return campaignService.create(request, me);
    }

    @PostMapping("/join")
    public CampaignDtos.CampaignResponse join(AppUser me, @Valid @RequestBody CampaignDtos.JoinRequest request) {
        return campaignService.join(request, me);
    }

    @GetMapping("/{campaignId}")
    public CampaignDtos.CampaignResponse get(AppUser me, @PathVariable Long campaignId) {
        return campaignService.get(campaignId, me);
    }

    @PutMapping("/{campaignId}")
    public CampaignDtos.CampaignResponse update(AppUser me, @PathVariable Long campaignId,
                                                @Valid @RequestBody CampaignDtos.CampaignRequest request) {
        return campaignService.update(campaignId, request, me);
    }

    @DeleteMapping("/{campaignId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(AppUser me, @PathVariable Long campaignId) {
        campaignService.delete(campaignId, me);
    }

    @PostMapping("/{campaignId}/invite-code")
    public CampaignDtos.CampaignResponse regenerateInviteCode(AppUser me, @PathVariable Long campaignId) {
        return campaignService.regenerateInviteCode(campaignId, me);
    }

    @GetMapping("/{campaignId}/members")
    public List<CampaignDtos.MemberResponse> members(AppUser me, @PathVariable Long campaignId) {
        return campaignService.listMembers(campaignId, me);
    }

    @PatchMapping("/{campaignId}/members/{memberId}")
    public CampaignDtos.MemberResponse changeRole(AppUser me, @PathVariable Long campaignId,
                                                  @PathVariable Long memberId,
                                                  @Valid @RequestBody CampaignDtos.RoleChangeRequest request) {
        return campaignService.changeRole(campaignId, memberId, request.role(), me);
    }

    @DeleteMapping("/{campaignId}/members/{memberId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(AppUser me, @PathVariable Long campaignId, @PathVariable Long memberId) {
        campaignService.removeMember(campaignId, memberId, me);
    }
}
