package com.lisone.dmassistant;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MapAndMarkerApiTest extends ApiTestSupport {

    private static final long CORP_TYPE = 2;

    @Test
    void masterUploadsMapAndDimensionsAreReadFromTheImage() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 320, 200);

        getAs("player", c.url() + "/maps/" + mapId).andExpect(status().isOk())
                .andExpect(jsonPath("$.width").value(320))
                .andExpect(jsonPath("$.height").value(200));
        getAs("player", c.url() + "/maps/" + mapId + "/image").andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        getAs("stranger", c.url() + "/maps/" + mapId + "/image").andExpect(status().isNotFound());
    }

    @Test
    void playersCannotUploadMapsAndNonImagesAreRejected() throws Exception {
        Campaign c = campaignWithParty();
        MockMultipartFile png = new MockMultipartFile("file", "map.png", "image/png", png(10, 10));
        mvc.perform(multipart(c.url() + "/maps").file(png).param("name", "x").with(as("player")))
                .andExpect(status().isForbidden());

        MockMultipartFile fake = new MockMultipartFile("file", "evil.png", "image/png",
                "<svg onload=alert(1)>".getBytes());
        mvc.perform(multipart(c.url() + "/maps").file(fake).param("name", "x").with(as("master")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void hiddenMarkersAndGmNotesNeverReachPlayers() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 1000, 800);
        String markers = c.url() + "/maps/" + mapId + "/markers";

        postAs("master", markers, marker("Renraku Arcology", 500, 400, "VISIBLE", "Ambush on floor 3"))
                .andExpect(status().isCreated());
        long hiddenId = id(postAs("owner", markers, marker("Secret lab", 100, 100, "HIDDEN", "Bug spirits"))
                .andExpect(status().isCreated()));

        getAs("master", markers).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].gmNotes").value("Ambush on floor 3"));
        getAs("player", markers).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Renraku Arcology"))
                .andExpect(jsonPath("$[0].gmNotes").value(nullValue()));
        getAs("player", c.url() + "/maps/" + mapId).andExpect(jsonPath("$.markerCount").value(1));

        // The runners found the lab: the master reveals it.
        patchAs("master", markers + "/" + hiddenId + "/visibility", "{\"visibility\":\"VISIBLE\"}")
                .andExpect(status().isOk());
        getAs("player", markers).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[1].gmNotes").value(nullValue()));
    }

    @Test
    void updatingAMarkerWithoutVisibilityKeepsItHidden() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 100, 100);
        String markers = c.url() + "/maps/" + mapId + "/markers";
        long id = id(postAs("master", markers, marker("Vault", 10, 10, "HIDDEN", null)));

        putAs("master", markers + "/" + id, "{\"typeId\":" + CORP_TYPE + ",\"title\":\"Vault\",\"x\":20,\"y\":20}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("HIDDEN"));
        getAs("player", markers).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void playersCannotChangeMarkers() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 100, 100);
        String markers = c.url() + "/maps/" + mapId + "/markers";
        long markerId = id(postAs("master", markers, marker("Bar", 10, 10, "VISIBLE", null)));

        postAs("player", markers, marker("Mine", 10, 10, "VISIBLE", null)).andExpect(status().isForbidden());
        putAs("player", markers + "/" + markerId, marker("Renamed", 10, 10, "VISIBLE", null))
                .andExpect(status().isForbidden());
        patchAs("player", markers + "/" + markerId + "/visibility", "{\"visibility\":\"HIDDEN\"}")
                .andExpect(status().isForbidden());
        deleteAs("player", markers + "/" + markerId).andExpect(status().isForbidden());
    }

    @Test
    void markerMustStayInsideTheMapAndUseAKnownType() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 100, 100);
        String markers = c.url() + "/maps/" + mapId + "/markers";
        postAs("master", markers, marker("Far away", 500, 10, "VISIBLE", null)).andExpect(status().isBadRequest());
        postAs("master", markers, "{\"typeId\":999999,\"title\":\"x\",\"x\":1,\"y\":1}")
                .andExpect(status().isBadRequest());
        postAs("master", markers, "{\"typeId\":1,\"title\":\"\",\"x\":1,\"y\":1}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void personalMarkerNotesArePrivateToTheirAuthor() throws Exception {
        Campaign c = campaignWithParty();
        long mapId = uploadMap(c.id(), "master", 100, 100);
        String markers = c.url() + "/maps/" + mapId + "/markers";
        long visibleId = id(postAs("master", markers, marker("Club Penumbra", 50, 50, "VISIBLE", null)));
        long hiddenId = id(postAs("master", markers, marker("Vault", 20, 20, "HIDDEN", null)));

        long noteId = id(postAs("player", markers + "/" + visibleId + "/my-notes",
                "{\"content\":\"Bouncer takes bribes\"}").andExpect(status().isCreated()));
        postAs("player", markers + "/" + hiddenId + "/my-notes", "{\"content\":\"peek\"}")
                .andExpect(status().isNotFound());

        String myNotes = c.url() + "/maps/" + mapId + "/my-notes";
        getAs("player", myNotes).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].content").value("Bouncer takes bribes"));
        getAs("player2", myNotes).andExpect(jsonPath("$", hasSize(0)));
        getAs("master", myNotes).andExpect(jsonPath("$", hasSize(0)));

        putAs("player2", c.url() + "/my-notes/" + noteId, "{\"content\":\"hijack\"}").andExpect(status().isNotFound());
        deleteAs("master", c.url() + "/my-notes/" + noteId).andExpect(status().isNotFound());
        putAs("player", c.url() + "/my-notes/" + noteId, "{\"content\":\"Bouncer is named Rico\"}")
                .andExpect(status().isOk());

        // Hiding the marker again hides the notes attached to it as well.
        patchAs("master", markers + "/" + visibleId + "/visibility", "{\"visibility\":\"HIDDEN\"}");
        getAs("player", myNotes).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void customMarkerTypesAreManagedByMasters() throws Exception {
        Campaign c = campaignWithParty();
        String types = c.url() + "/marker-types";
        String dragon = "{\"name\":\"Dragon lair\",\"shape\":\"STAR\",\"color\":\"#ff0000\",\"icon\":\"🐉\"}";

        postAs("player", types, dragon).andExpect(status().isForbidden());
        long typeId = id(postAs("master", types, dragon).andExpect(status().isCreated())
                .andExpect(jsonPath("$.color").value("#FF0000"))
                .andExpect(jsonPath("$.builtIn").value(false)));
        int builtIns = ((net.minidev.json.JSONArray) read(getAs("player", types), "$[?(@.builtIn == true)]")).size();
        getAs("player", types).andExpect(jsonPath("$", hasSize(builtIns + 1)));

        putAs("master", types + "/" + CORP_TYPE, dragon).andExpect(status().isNotFound());
        postAs("master", types, "{\"name\":\"Bad\",\"shape\":\"STAR\",\"color\":\"red\"}")
                .andExpect(status().isBadRequest());

        long mapId = uploadMap(c.id(), "master", 100, 100);
        String markers = c.url() + "/maps/" + mapId + "/markers";
        long markerId = id(postAs("master", markers,
                "{\"typeId\":" + typeId + ",\"title\":\"Lofwyr?\",\"x\":5,\"y\":5}"));
        deleteAs("master", types + "/" + typeId).andExpect(status().isConflict());
        deleteAs("master", markers + "/" + markerId).andExpect(status().isNoContent());
        deleteAs("master", types + "/" + typeId).andExpect(status().isNoContent());

        // Another campaign can't use this campaign's custom types.
        Campaign other = campaignWithParty();
        long otherType = id(postAs("master", other.url() + "/marker-types", dragon));
        postAs("master", markers, "{\"typeId\":" + otherType + ",\"title\":\"x\",\"x\":5,\"y\":5}")
                .andExpect(status().isBadRequest());
    }

    private static String marker(String title, double x, double y, String visibility, String gmNotes) {
        return "{\"typeId\":" + CORP_TYPE + ",\"title\":\"" + title + "\",\"description\":\"Public info\","
                + "\"x\":" + x + ",\"y\":" + y + ",\"visibility\":\"" + visibility + "\""
                + (gmNotes == null ? "" : ",\"gmNotes\":\"" + gmNotes + "\"") + "}";
    }
}
