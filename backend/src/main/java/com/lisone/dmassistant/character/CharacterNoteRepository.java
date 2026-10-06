package com.lisone.dmassistant.character;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CharacterNoteRepository extends JpaRepository<CharacterNote, Long> {

    List<CharacterNote> findAllByCharacterIdOrderByUpdatedAtDesc(Long characterId);

    Optional<CharacterNote> findByIdAndCharacterId(Long id, Long characterId);
}
