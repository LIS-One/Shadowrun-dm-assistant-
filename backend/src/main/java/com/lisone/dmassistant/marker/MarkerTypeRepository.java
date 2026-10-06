package com.lisone.dmassistant.marker;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MarkerTypeRepository extends JpaRepository<MarkerType, Long> {

    @Query("select t from MarkerType t where t.campaignId is null or t.campaignId = :campaignId "
            + "order by t.sortOrder, t.id")
    List<MarkerType> findAvailable(Long campaignId);

    @Query("select t from MarkerType t where t.id = :id and (t.campaignId is null or t.campaignId = :campaignId)")
    Optional<MarkerType> findAvailable(Long id, Long campaignId);

    Optional<MarkerType> findByIdAndCampaignId(Long id, Long campaignId);
}
