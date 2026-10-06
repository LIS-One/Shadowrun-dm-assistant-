package com.lisone.dmassistant.sessionlog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SessionLogRepository extends JpaRepository<SessionLog, Long> {

    String ORDER = " order by l.playedOn desc nulls last, l.sessionNumber desc nulls last, l.id desc";

    @Query("select l from SessionLog l left join fetch l.author where l.campaignId = :campaignId" + ORDER)
    List<SessionLog> findAllInCampaign(Long campaignId);

    @Query("select l from SessionLog l left join fetch l.author where l.campaignId = :campaignId "
            + "and l.published = true" + ORDER)
    List<SessionLog> findPublishedInCampaign(Long campaignId);

    @Query("select l from SessionLog l left join fetch l.author where l.id = :id and l.campaignId = :campaignId")
    Optional<SessionLog> findInCampaign(Long id, Long campaignId);
}
