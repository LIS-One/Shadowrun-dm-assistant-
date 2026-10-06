package com.lisone.dmassistant.marker;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarkerRepository extends JpaRepository<Marker, Long> {

    List<Marker> findAllByMapIdOrderByIdAsc(Long mapId);

    List<Marker> findAllByMapIdAndVisibilityOrderByIdAsc(Long mapId, MarkerVisibility visibility);

    Optional<Marker> findByIdAndMapId(Long id, Long mapId);

    long countByMapId(Long mapId);

    long countByMapIdAndVisibility(Long mapId, MarkerVisibility visibility);

    boolean existsByMarkerTypeId(Long markerTypeId);
}
