package com.lisone.dmassistant.map;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GameMapRepository extends JpaRepository<GameMap, Long> {

    List<GameMap> findAllByCampaignIdOrderByCreatedAtAsc(Long campaignId);

    Optional<GameMap> findByIdAndCampaignId(Long id, Long campaignId);

    @Query("select m.storageKey from GameMap m where m.campaignId = :campaignId")
    List<String> findStorageKeysByCampaignId(Long campaignId);
}
