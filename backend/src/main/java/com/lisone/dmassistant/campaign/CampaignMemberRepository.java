package com.lisone.dmassistant.campaign;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, Long> {

    @Query("select m from CampaignMember m join fetch m.campaign where m.campaign.id = :campaignId and m.user.id = :userId")
    Optional<CampaignMember> findMembership(Long campaignId, Long userId);

    @Query("select m from CampaignMember m join fetch m.campaign where m.user.id = :userId order by m.campaign.createdAt desc")
    List<CampaignMember> findAllByUserId(Long userId);

    @Query("select m from CampaignMember m join fetch m.user where m.campaign.id = :campaignId order by m.joinedAt")
    List<CampaignMember> findAllByCampaignId(Long campaignId);

    long countByCampaignId(Long campaignId);

    long countByCampaignIdAndRole(Long campaignId, CampaignRole role);

    Optional<CampaignMember> findByIdAndCampaignId(Long id, Long campaignId);
}
