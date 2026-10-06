package com.lisone.dmassistant.character;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CharacterRepository extends JpaRepository<PlayerCharacter, Long> {

    @Query("select c from PlayerCharacter c join fetch c.owner where c.campaignId = :campaignId order by c.name")
    List<PlayerCharacter> findAllInCampaign(Long campaignId);

    @Query("select c from PlayerCharacter c join fetch c.owner where c.campaignId = :campaignId "
            + "and c.owner.id = :ownerId order by c.name")
    List<PlayerCharacter> findAllInCampaignOwnedBy(Long campaignId, Long ownerId);

    @Query("select c from PlayerCharacter c join fetch c.owner where c.id = :id and c.campaignId = :campaignId")
    Optional<PlayerCharacter> findInCampaign(Long id, Long campaignId);
}
