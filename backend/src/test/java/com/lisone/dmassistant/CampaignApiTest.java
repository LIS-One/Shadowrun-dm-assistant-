package com.lisone.dmassistant;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CampaignApiTest extends ApiTestSupport {

    @Test
    void requestsWithoutTokenAreRejected() throws Exception {
        mvc.perform(get("/api/campaigns")).andExpect(status().isUnauthorized());
    }

    @Test
    void creatorBecomesOwnerAndJoinersBecomePlayers() throws Exception {
        Campaign c = campaignWithParty();

        getAs("owner", c.url()).andExpect(status().isOk())
                .andExpect(jsonPath("$.myRole").value("OWNER"))
                .andExpect(jsonPath("$.inviteCode").value(c.inviteCode()))
                .andExpect(jsonPath("$.memberCount").value(4));
        getAs("master", c.url()).andExpect(jsonPath("$.myRole").value("MASTER"));
        getAs("player", c.url()).andExpect(status().isOk())
                .andExpect(jsonPath("$.myRole").value("PLAYER"))
                .andExpect(jsonPath("$.inviteCode").value(nullValue()));
        getAs("player", "/api/campaigns").andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void outsidersCannotSeeTheCampaign() throws Exception {
        Campaign c = campaignWithParty();
        getAs("stranger", c.url()).andExpect(status().isNotFound());
        getAs("stranger", c.url() + "/maps").andExpect(status().isNotFound());
    }

    @Test
    void onlyOwnerManagesMembersAndLastOwnerIsProtected() throws Exception {
        Campaign c = campaignWithParty();
        long ownerMemberId = ((Number) read(getAs("owner", c.url() + "/members"), "$[0].id")).longValue();
        long playerMemberId = ((Number) read(getAs("owner", c.url() + "/members"), "$[2].id")).longValue();

        patchAs("master", c.url() + "/members/" + playerMemberId, "{\"role\":\"MASTER\"}")
                .andExpect(status().isForbidden());
        patchAs("owner", c.url() + "/members/" + ownerMemberId, "{\"role\":\"PLAYER\"}")
                .andExpect(status().isConflict());
        deleteAs("player", c.url() + "/members/" + ownerMemberId).andExpect(status().isForbidden());

        // Anyone may leave on their own.
        deleteAs("player", c.url() + "/members/" + playerMemberId).andExpect(status().isNoContent());
        getAs("player", c.url()).andExpect(status().isNotFound());
    }

    @Test
    void ownerCanRotateInviteCodeAndDeleteCampaign() throws Exception {
        Campaign c = campaignWithParty();
        postAs("master", c.url() + "/invite-code", "").andExpect(status().isForbidden());
        String newCode = read(postAs("owner", c.url() + "/invite-code", "").andExpect(status().isOk()), "$.inviteCode");
        postAs("latecomer", "/api/campaigns/join", "{\"inviteCode\":\"" + c.inviteCode() + "\"}")
                .andExpect(status().isNotFound());
        postAs("latecomer", "/api/campaigns/join", "{\"inviteCode\":\"" + newCode.toLowerCase() + "\"}")
                .andExpect(status().isOk());

        deleteAs("master", c.url()).andExpect(status().isForbidden());
        deleteAs("owner", c.url()).andExpect(status().isNoContent());
        getAs("owner", c.url()).andExpect(status().isNotFound());
    }
}
