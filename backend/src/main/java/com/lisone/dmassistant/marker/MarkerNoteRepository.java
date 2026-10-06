package com.lisone.dmassistant.marker;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MarkerNoteRepository extends JpaRepository<MarkerNote, Long> {

    /** The author's notes on a map, limited to markers they are currently allowed to see. */
    @Query("select n from MarkerNote n, Marker m where m.id = n.markerId and m.mapId = :mapId "
            + "and n.authorId = :authorId and m.visibility in :visibilities order by n.createdAt")
    List<MarkerNote> findMine(Long mapId, Long authorId, List<MarkerVisibility> visibilities);

    @Query("select n from MarkerNote n, Marker m, GameMap g where n.id = :noteId and n.authorId = :authorId "
            + "and m.id = n.markerId and g.id = m.mapId and g.campaignId = :campaignId "
            + "and m.visibility in :visibilities")
    Optional<MarkerNote> findMine(Long noteId, Long authorId, Long campaignId, List<MarkerVisibility> visibilities);
}
