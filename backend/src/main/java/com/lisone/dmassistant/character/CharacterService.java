package com.lisone.dmassistant.character;

import com.lisone.dmassistant.campaign.CampaignAccess;
import com.lisone.dmassistant.campaign.CampaignMember;
import com.lisone.dmassistant.common.ApiException;
import com.lisone.dmassistant.user.AppUser;
import com.lisone.dmassistant.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Characters belong to the member who created them. Masters can read every sheet in their campaign
 * (to prepare sessions) but only the owner edits it.
 */
@Service
public class CharacterService {

    static final int MAX_SHEET_BYTES = 256 * 1024;
    private static final TypeReference<Map<String, Object>> SHEET_TYPE = new TypeReference<>() {
    };

    private final CharacterRepository characters;
    private final AppUserRepository users;
    private final CampaignAccess access;
    private final JsonMapper json;

    public CharacterService(CharacterRepository characters, AppUserRepository users, CampaignAccess access,
                            JsonMapper json) {
        this.characters = characters;
        this.users = users;
        this.access = access;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public List<CharacterDtos.CharacterSummary> list(Long campaignId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        List<PlayerCharacter> found = membership.getRole().canManageWorld()
                ? characters.findAllInCampaign(campaignId)
                : characters.findAllInCampaignOwnedBy(campaignId, me.getId());
        return found.stream().map(c -> summary(c, me)).toList();
    }

    @Transactional(readOnly = true)
    public CharacterDtos.CharacterResponse get(Long campaignId, Long characterId, AppUser me) {
        return response(requireReadable(campaignId, characterId, me), me);
    }

    @Transactional
    public CharacterDtos.CharacterResponse create(Long campaignId, CharacterDtos.CharacterRequest request, AppUser me) {
        access.requireMember(campaignId, me);
        PlayerCharacter character = new PlayerCharacter(campaignId, users.getReferenceById(me.getId()));
        character.setName(request.name().trim());
        character.setSheetJson(serialize(request.sheet()));
        return response(characters.save(character), me);
    }

    @Transactional
    public CharacterDtos.CharacterResponse update(Long campaignId, Long characterId,
                                                  CharacterDtos.CharacterRequest request, AppUser me) {
        PlayerCharacter character = requireOwned(campaignId, characterId, me);
        character.setName(request.name().trim());
        character.setSheetJson(serialize(request.sheet()));
        return response(character, me);
    }

    @Transactional
    public void delete(Long campaignId, Long characterId, AppUser me) {
        characters.delete(requireOwned(campaignId, characterId, me));
    }

    /** Owner-only access, used for edits and for the character's private notes. */
    PlayerCharacter requireOwned(Long campaignId, Long characterId, AppUser me) {
        access.requireMember(campaignId, me);
        PlayerCharacter character = characters.findInCampaign(characterId, campaignId)
                .orElseThrow(() -> ApiException.notFound("Character"));
        if (!character.getOwner().getId().equals(me.getId())) {
            throw ApiException.forbidden("Only the character's player can do this");
        }
        return character;
    }

    private PlayerCharacter requireReadable(Long campaignId, Long characterId, AppUser me) {
        CampaignMember membership = access.requireMember(campaignId, me);
        PlayerCharacter character = characters.findInCampaign(characterId, campaignId)
                .orElseThrow(() -> ApiException.notFound("Character"));
        boolean mine = character.getOwner().getId().equals(me.getId());
        if (!mine && !membership.getRole().canManageWorld()) {
            throw ApiException.notFound("Character");
        }
        return character;
    }

    private String serialize(Map<String, Object> sheet) {
        String serialized = json.writeValueAsString(sheet);
        if (serialized.getBytes(StandardCharsets.UTF_8).length > MAX_SHEET_BYTES) {
            throw ApiException.badRequest("Character sheet is too large");
        }
        return serialized;
    }

    private Map<String, Object> deserialize(String sheetJson) {
        return json.readValue(sheetJson, SHEET_TYPE);
    }

    private CharacterDtos.CharacterSummary summary(PlayerCharacter c, AppUser me) {
        Map<String, Object> sheet = deserialize(c.getSheetJson());
        return new CharacterDtos.CharacterSummary(c.getId(), c.getName(), c.getOwner().getId(),
                c.getOwner().getDisplayName(), stringField(sheet, "metatype"), stringField(sheet, "role"),
                c.getOwner().getId().equals(me.getId()), c.getUpdatedAt());
    }

    private CharacterDtos.CharacterResponse response(PlayerCharacter c, AppUser me) {
        boolean mine = c.getOwner().getId().equals(me.getId());
        return new CharacterDtos.CharacterResponse(c.getId(), c.getCampaignId(), c.getName(), c.getOwner().getId(),
                c.getOwner().getDisplayName(), mine, deserialize(c.getSheetJson()), c.getCreatedAt(),
                c.getUpdatedAt());
    }

    private static String stringField(Map<String, Object> sheet, String key) {
        Object value = sheet.get(key);
        return value instanceof String s && !s.isBlank() ? s : null;
    }
}
