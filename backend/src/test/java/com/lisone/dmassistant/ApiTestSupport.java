package com.lisone.dmassistant;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

    @Autowired
    protected MockMvc mvc;

    /** Unique per test so tests never see each other's data in the shared in-memory database. */
    protected String run;

    @BeforeEach
    void newRun() {
        run = UUID.randomUUID().toString().substring(0, 8);
    }

    /** An Auth0-like access token for a test persona. */
    protected RequestPostProcessor as(String persona) {
        String subject = "auth0|" + persona + "-" + run;
        return jwt().jwt(j -> j.subject(subject).claim("name", persona));
    }

    protected ResultActions call(MockHttpServletRequestBuilder request, String persona) throws Exception {
        return mvc.perform(request.with(as(persona)));
    }

    protected ResultActions getAs(String persona, String url) throws Exception {
        return call(get(url), persona);
    }

    protected ResultActions postAs(String persona, String url, String json) throws Exception {
        return call(post(url).contentType(MediaType.APPLICATION_JSON).content(json), persona);
    }

    protected ResultActions putAs(String persona, String url, String json) throws Exception {
        return call(put(url).contentType(MediaType.APPLICATION_JSON).content(json), persona);
    }

    protected ResultActions patchAs(String persona, String url, String json) throws Exception {
        return call(patch(url).contentType(MediaType.APPLICATION_JSON).content(json), persona);
    }

    protected ResultActions deleteAs(String persona, String url) throws Exception {
        return call(delete(url), persona);
    }

    protected static <T> T read(ResultActions result, String path) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), path);
    }

    protected static long id(ResultActions result) throws Exception {
        return ((Number) read(result, "$.id")).longValue();
    }

    /** Creates a campaign owned by "owner" with "master" promoted to MASTER and "player"/"player2" as players. */
    protected Campaign campaignWithParty() throws Exception {
        ResultActions created = postAs("owner", "/api/campaigns", "{\"name\":\"Seattle 2080\"}")
                .andExpect(status().isCreated());
        long campaignId = id(created);
        String code = read(created, "$.inviteCode");
        for (String persona : new String[]{"master", "player", "player2"}) {
            postAs(persona, "/api/campaigns/join", "{\"inviteCode\":\"" + code + "\"}").andExpect(status().isOk());
        }
        ResultActions members = getAs("owner", "/api/campaigns/" + campaignId + "/members");
        Number masterMemberId = ((net.minidev.json.JSONArray) read(members,
                "$[?(@.displayName == 'master')].id")).stream().map(Number.class::cast).findFirst().orElseThrow();
        patchAs("owner", "/api/campaigns/" + campaignId + "/members/" + masterMemberId, "{\"role\":\"MASTER\"}")
                .andExpect(status().isOk());
        return new Campaign(campaignId, code);
    }

    protected long uploadMap(long campaignId, String persona, int width, int height) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "map.png", "image/png", png(width, height));
        ResultActions result = mvc.perform(multipart("/api/campaigns/" + campaignId + "/maps")
                        .file(file).param("name", "Downtown").with(as(persona)))
                .andExpect(status().isCreated());
        return id(result);
    }

    protected static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    protected record Campaign(long id, String inviteCode) {
        public String url() {
            return "/api/campaigns/" + id;
        }
    }
}
