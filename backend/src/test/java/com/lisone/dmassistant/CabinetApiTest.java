package com.lisone.dmassistant;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CabinetApiTest extends ApiTestSupport {

    private static final String SHEET = """
            {"name":"Ghost","sheet":{"metatype":"Elf","role":"Decker",
             "attributes":{"BOD":3,"AGI":5,"REA":4},"skills":[{"name":"Hacking","rating":6}]}}""";

    @Test
    void charactersBelongToTheirPlayerAndMastersCanOnlyRead() throws Exception {
        Campaign c = campaignWithParty();
        String characters = c.url() + "/characters";
        long id = id(postAs("player", characters, SHEET).andExpect(status().isCreated())
                .andExpect(jsonPath("$.editable").value(true))
                .andExpect(jsonPath("$.sheet.attributes.AGI").value(5)));

        getAs("player", characters).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].metatype").value("Elf"))
                .andExpect(jsonPath("$[0].mine").value(true));
        getAs("player2", characters).andExpect(jsonPath("$", hasSize(0)));
        getAs("player2", characters + "/" + id).andExpect(status().isNotFound());

        getAs("master", characters).andExpect(jsonPath("$", hasSize(1)));
        getAs("master", characters + "/" + id).andExpect(status().isOk())
                .andExpect(jsonPath("$.editable").value(false))
                .andExpect(jsonPath("$.sheet.skills[0].name").value("Hacking"));
        putAs("master", characters + "/" + id, SHEET).andExpect(status().isForbidden());
        deleteAs("player2", characters + "/" + id).andExpect(status().isForbidden());

        putAs("player", characters + "/" + id, SHEET.replace("\"Ghost\"", "\"Ghost Mk2\""))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Ghost Mk2"));
    }

    @Test
    void characterNotesAreAPrivateJournal() throws Exception {
        Campaign c = campaignWithParty();
        long id = id(postAs("player", c.url() + "/characters", SHEET));
        String notes = c.url() + "/characters/" + id + "/notes";

        long noteId = id(postAs("player", notes, "{\"title\":\"Debts\",\"content\":\"Owe Mr. Johnson 5k\"}")
                .andExpect(status().isCreated()));
        getAs("player", notes).andExpect(jsonPath("$", hasSize(1)));
        getAs("master", notes).andExpect(status().isForbidden());
        getAs("player2", notes).andExpect(status().isForbidden());
        putAs("player", notes + "/" + noteId, "{\"title\":\"Debts\",\"content\":\"Paid off\"}")
                .andExpect(jsonPath("$.content").value("Paid off"));
        deleteAs("player", notes + "/" + noteId).andExpect(status().isNoContent());
    }

    @Test
    void playersSeeOnlyPublishedSessionLogs() throws Exception {
        Campaign c = campaignWithParty();
        String logs = c.url() + "/session-logs";
        String draft = "{\"sessionNumber\":2,\"title\":\"The Big Score\",\"playedOn\":\"2080-03-14\",\"published\":false}";
        String published = "{\"sessionNumber\":1,\"title\":\"First Run\",\"summary\":\"Met Mr. Johnson\","
                + "\"published\":true}";

        postAs("player", logs, published).andExpect(status().isForbidden());
        long draftId = id(postAs("master", logs, draft).andExpect(status().isCreated()));
        postAs("master", logs, published).andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorName").value("master"));

        getAs("master", logs).andExpect(jsonPath("$", hasSize(2)));
        getAs("player", logs).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("First Run"));
        getAs("player", logs + "/" + draftId).andExpect(status().isNotFound());

        putAs("master", logs + "/" + draftId, draft.replace("false", "true")).andExpect(status().isOk());
        getAs("player", logs).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").value("The Big Score"));
    }

    @Test
    void profileCanBeSyncedFromTheIdToken() throws Exception {
        putAs("player", "/api/me", "{\"displayName\":\"Ghost\",\"email\":\"ghost@example.com\"}")
                .andExpect(status().isOk());
        getAs("player", "/api/me").andExpect(jsonPath("$.displayName").value("Ghost"))
                .andExpect(jsonPath("$.email").value("ghost@example.com"));
    }
}
