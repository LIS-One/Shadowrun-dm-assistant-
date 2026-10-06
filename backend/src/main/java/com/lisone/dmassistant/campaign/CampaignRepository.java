package com.lisone.dmassistant.campaign;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    Optional<Campaign> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    /** Bulk delete; the database cascades to members, maps, markers, characters and logs. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Campaign c where c.id = :id")
    void deleteCampaign(Long id);
}
