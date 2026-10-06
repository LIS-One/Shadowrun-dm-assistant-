"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOverlay, MapContainer, Marker as LeafletMarker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { useToast } from "@/components/Toaster";
import { api, backendUrl, errorMessage, fetcher } from "@/lib/api";
import type { GameMap, Marker, MarkerInput, MarkerNote, MarkerType } from "@/lib/types";
import { MarkerForm } from "./MarkerForm";
import { MarkerGlyph } from "./MarkerGlyph";
import { markerSvg } from "./markerIcon";
import { MarkerDetails } from "./MarkerPanel";

/*
 * Coordinates: markers are stored in image pixels (x → right, y → down). Leaflet's CRS.Simple
 * uses lat/lng where lat grows upwards, so a pixel (x, y) maps to latLng(-y, x).
 */
const toLatLng = (x: number, y: number) => L.latLng(-y, x);
const fromLatLng = (latLng: L.LatLng) => ({ x: latLng.lng, y: -latLng.lat });

type Panel = { kind: "view"; id: number } | { kind: "edit"; id: number } | { kind: "create"; x: number; y: number } | null;

interface ContextMenuState {
  x: number;
  y: number;
  left: number;
  top: number;
}

export default function MapViewer({ campaignId, mapId }: { campaignId: number; mapId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { isMaster } = useCampaign();
  const base = `/campaigns/${campaignId}`;

  const { data: map, error: mapError } = useSWR<GameMap>(`${base}/maps/${mapId}`, fetcher);
  const { data: allMaps } = useSWR<GameMap[]>(`${base}/maps`, fetcher);
  const { data: types = [] } = useSWR<MarkerType[]>(`${base}/marker-types`, fetcher);
  // Polling lets players see markers appear as soon as the master reveals them.
  const { data: markers = [], mutate: mutateMarkers } = useSWR<Marker[]>(`${base}/maps/${mapId}/markers`, fetcher, {
    refreshInterval: 10_000,
  });
  const { data: notes = [], mutate: mutateNotes } = useSWR<MarkerNote[]>(`${base}/maps/${mapId}/my-notes`, fetcher, {
    refreshInterval: 30_000,
  });

  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [viewAsPlayer, setViewAsPlayer] = useState(false);
  const masterMode = isMaster && !viewAsPlayer;
  const [panelState, setPanel] = useState<Panel>(null);
  const [placingState, setPlacing] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<number>>(new Set());
  const [hiddenOnlyState, setHiddenOnly] = useState(false);
  const placing = placingState && masterMode;
  const hiddenOnly = hiddenOnlyState && masterMode;
  const [legendOpen, setLegendOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);

  // Players never receive hidden markers; the "player view" preview hides them for masters too.
  const visibleMarkers = useMemo(
    () => (masterMode ? markers : markers.filter((m) => m.visibility === "VISIBLE")),
    [markers, masterMode],
  );
  const shownMarkers = useMemo(
    () =>
      visibleMarkers.filter(
        (m) => (activeTypes.size === 0 || activeTypes.has(m.typeId)) && (!hiddenOnly || m.visibility === "HIDDEN"),
      ),
    [visibleMarkers, activeTypes, hiddenOnly],
  );
  const typesOnMap = useMemo(() => {
    const counts = new Map<number, number>();
    visibleMarkers.forEach((m) => counts.set(m.typeId, (counts.get(m.typeId) ?? 0) + 1));
    return types.filter((t) => counts.has(t.id)).map((t) => ({ type: t, count: counts.get(t.id)! }));
  }, [visibleMarkers, types]);
  const hiddenCount = markers.filter((m) => m.visibility === "HIDDEN").length;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visibleMarkers
      .filter((m) =>
        [m.title, m.description, typeById.get(m.typeId)?.name].some((s) => s?.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, visibleMarkers, typeById]);


  /*
   * What the panel actually shows. Editing tools disappear outside master mode, and a marker that
   * vanished (deleted, or hidden by the master while a player looks at it) closes its panel.
   */
  const panel: Panel = (() => {
    if (!panelState) return null;
    if (panelState.kind === "create") return masterMode ? panelState : null;
    if (!visibleMarkers.some((m) => m.id === panelState.id)) return null;
    return panelState.kind === "edit" && !masterMode ? { kind: "view", id: panelState.id } : panelState;
  })();
  const selectedId = panel && panel.kind !== "create" ? panel.id : null;
  const selectedMarker = selectedId != null ? markers.find((m) => m.id === selectedId) : undefined;

  function focusMarker(m: Marker) {
    setPanel({ kind: "view", id: m.id });
    setQuery("");
    searchRef.current?.blur();
    if (leafletMap) {
      const zoom = Math.max(leafletMap.getZoom(), leafletMap.getMinZoom() + 2);
      leafletMap.flyTo(toLatLng(m.x, m.y), zoom, { duration: 0.6 });
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        if (contextMenu) setContextMenu(null);
        else if (placing) setPlacing(false);
        else if (!typing) setPanel(null);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextMenu, placing]);

  // ---- mutations -------------------------------------------------------------------------

  const markersUrl = `${base}/maps/${mapId}/markers`;

  async function createMarker(input: MarkerInput) {
    try {
      const created = await api<Marker>(markersUrl, { method: "POST", json: input });
      await mutateMarkers((list = []) => [...list, created], { revalidate: false });
      setPanel({ kind: "view", id: created.id });
      toast(created.visibility === "HIDDEN" ? "Скрытая метка создана" : "Метка создана", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function updateMarker(id: number, input: MarkerInput) {
    try {
      const updated = await api<Marker>(`${markersUrl}/${id}`, { method: "PUT", json: input });
      await mutateMarkers((list = []) => list.map((m) => (m.id === id ? updated : m)), { revalidate: false });
      setPanel({ kind: "view", id });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function moveMarker(m: Marker, latLng: L.LatLng) {
    if (!map) return;
    const { x, y } = fromLatLng(latLng);
    const clamped = { x: Math.min(Math.max(x, 0), map.width), y: Math.min(Math.max(y, 0), map.height) };
    const input: MarkerInput = {
      typeId: m.typeId,
      title: m.title,
      description: m.description,
      gmNotes: m.gmNotes,
      visibility: m.visibility,
      ...clamped,
    };
    await mutateMarkers((list = []) => list.map((it) => (it.id === m.id ? { ...it, ...clamped } : it)), { revalidate: false });
    try {
      await api(`${markersUrl}/${m.id}`, { method: "PUT", json: input });
    } catch (err) {
      toast(errorMessage(err), "error");
      mutateMarkers();
    }
  }

  async function toggleVisibility(m: Marker) {
    const visibility = m.visibility === "HIDDEN" ? "VISIBLE" : "HIDDEN";
    try {
      const updated = await api<Marker>(`${markersUrl}/${m.id}/visibility`, { method: "PATCH", json: { visibility } });
      await mutateMarkers((list = []) => list.map((it) => (it.id === m.id ? updated : it)), { revalidate: false });
      toast(visibility === "VISIBLE" ? `«${m.title}» теперь видна игрокам` : `«${m.title}» скрыта от игроков`, "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function deleteMarker(m: Marker) {
    if (!confirm(`Удалить метку «${m.title}»? Заметки игроков к ней тоже удалятся.`)) return;
    try {
      await api(`${markersUrl}/${m.id}`, { method: "DELETE" });
      await mutateMarkers((list = []) => list.filter((it) => it.id !== m.id), { revalidate: false });
      setPanel(null);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function addNote(markerId: number, content: string) {
    try {
      const note = await api<MarkerNote>(`${markersUrl}/${markerId}/my-notes`, { method: "POST", json: { content } });
      await mutateNotes((list = []) => [...list, note], { revalidate: false });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function updateNote(noteId: number, content: string) {
    try {
      const note = await api<MarkerNote>(`${base}/my-notes/${noteId}`, { method: "PUT", json: { content } });
      await mutateNotes((list = []) => list.map((n) => (n.id === noteId ? note : n)), { revalidate: false });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function deleteNote(noteId: number) {
    try {
      await api(`${base}/my-notes/${noteId}`, { method: "DELETE" });
      await mutateNotes((list = []) => list.filter((n) => n.id !== noteId), { revalidate: false });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  // ---- rendering ---------------------------------------------------------------------------

  if (mapError) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
        <div className="text-center">
          <p className="text-red-400">{errorMessage(mapError)}</p>
          <Link href={base} className="btn-ghost mt-4">← К картам</Link>
        </div>
      </div>
    );
  }

  const panelOpen = panel !== null;
  const noteCountByMarker = notes.reduce<Record<number, number>>((acc, n) => ({ ...acc, [n.markerId]: (acc[n.markerId] ?? 0) + 1 }), {});

  return (
    <div className="fixed inset-0 z-50 bg-bg">
      {map ? (
        <MapContainer
          ref={setLeafletMap}
          crs={L.CRS.Simple}
          bounds={L.latLngBounds([-map.height, 0], [0, map.width])}
          maxBounds={L.latLngBounds([-map.height, 0], [0, map.width]).pad(0.5)}
          maxBoundsViscosity={0.8}
          minZoom={-6}
          maxZoom={5}
          zoomSnap={0.25}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={90}
          zoomControl={false}
          attributionControl={false}
          className={`h-full w-full ${placing ? "placing-marker" : ""}`}
        >
          <ImageOverlay url={backendUrl(map.imageUrl)} bounds={L.latLngBounds([-map.height, 0], [0, map.width])} />
          <FitToImage width={map.width} height={map.height} />
          <MapEvents
            onClick={(latLng) => {
              setContextMenu(null);
              if (placing) {
                const { x, y } = fromLatLng(latLng);
                if (x >= 0 && y >= 0 && x <= map.width && y <= map.height) {
                  setPanel({ kind: "create", x, y });
                  setPlacing(false);
                }
              }
            }}
            onContextMenu={(latLng, point) => {
              const { x, y } = fromLatLng(latLng);
              if (x < 0 || y < 0 || x > map.width || y > map.height) return;
              setContextMenu({ x, y, left: point.x, top: point.y });
            }}
            onMoveStart={() => setContextMenu(null)}
          />
          {shownMarkers.map((m) => {
            const type = typeById.get(m.typeId);
            return (
              <LeafletMarker
                key={m.id}
                position={toLatLng(m.x, m.y)}
                icon={buildIcon(type, m.visibility === "HIDDEN", m.id === selectedId, noteCountByMarker[m.id] ?? 0)}
                draggable={masterMode}
                zIndexOffset={m.id === selectedId ? 1000 : 0}
                eventHandlers={{
                  click: () => focusMarker(m),
                  dragend: (e) => moveMarker(m, (e.target as L.Marker).getLatLng()),
                }}
              >
                <Tooltip direction="top" offset={[0, -22]} className="dm-tooltip" opacity={1}>
                  {m.title}
                  {m.visibility === "HIDDEN" ? " · скрыта" : ""}
                </Tooltip>
              </LeafletMarker>
            );
          })}
          {panel?.kind === "create" && (
            <LeafletMarker position={toLatLng(panel.x, panel.y)} icon={DRAFT_ICON} interactive={false} />
          )}
          <CursorReadout />
        </MapContainer>
      ) : (
        <div className="grid h-full place-items-center text-slate-400">Загрузка карты…</div>
      )}

      {/* ---- search box (top-left) ---- */}
      <div className="absolute left-3 top-3 z-[1100] w-[min(400px,calc(100vw-24px))]">
        <div className="panel flex items-center gap-1 rounded-full px-2 py-1.5 shadow-2xl">
          <Link href={base} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-300 hover:bg-panel-2" title="К картам кампании">
            ←
          </Link>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults[0]) focusMarker(searchResults[0]);
            }}
            placeholder={map ? `Поиск по карте «${map.name}»` : "Поиск…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-500"
            aria-label="Поиск меток"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-panel-2" aria-label="Очистить">
              ✕
            </button>
          ) : (
            <span className="hidden pr-3 font-mono text-xs text-slate-600 sm:inline">/</span>
          )}
        </div>
        {searchFocused && query.trim() && (
          <div className="panel mt-2 overflow-hidden p-1">
            {searchResults.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Ничего не найдено</p>}
            {searchResults.map((m) => {
              const t = typeById.get(m.typeId);
              return (
                <button
                  key={m.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => focusMarker(m)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-panel-2"
                >
                  {t && <MarkerGlyph shape={t.shape} color={t.color} icon={t.icon} hidden={m.visibility === "HIDDEN"} size={24} />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{m.title}</span>
                    <span className="block truncate text-xs text-slate-500">{t?.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- type filter chips (top, next to the search box) ---- */}
      {(typesOnMap.length > 0 || (masterMode && hiddenCount > 0)) && (
        <div
          className="scrollbar-thin absolute left-[424px] top-3.5 z-[1050] hidden max-w-[calc(100vw-920px)] gap-2 overflow-x-auto pb-1 xl:flex"
        >
          {masterMode && hiddenCount > 0 && (
            <button
              onClick={() => setHiddenOnly((v) => !v)}
              className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 text-sm shadow-lg ${
                hiddenOnly ? "border-amber-400 bg-amber-500/20 text-amber-200" : "bg-panel/95"
              }`}
            >
              ◌ Скрытые · {hiddenCount}
            </button>
          )}
          {typesOnMap.map(({ type, count }) => (
            <TypeChip key={type.id} type={type} count={count} active={activeTypes.has(type.id)} onToggle={() => toggleType(type.id)} />
          ))}
        </div>
      )}

      {/* ---- top-right controls ---- */}
      <div className="absolute right-3 top-[68px] z-[1100] flex flex-col items-end gap-2 sm:top-3">
        <div className="flex items-center gap-2">
          {allMaps && allMaps.length > 1 && (
            <select
              value={mapId}
              onChange={(e) => router.push(`${base}/maps/${e.target.value}`)}
              className="panel h-10 max-w-[180px] rounded-full px-3 text-sm outline-none"
              aria-label="Другая карта"
            >
              {allMaps.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {isMaster && (
            <div className="panel flex h-10 items-center rounded-full p-1 text-xs" role="group" aria-label="Режим">
              <button
                onClick={() => setViewAsPlayer(false)}
                className={`rounded-full px-3 py-1.5 transition ${!viewAsPlayer ? "bg-accent-2 font-semibold text-slate-950" : "text-slate-300"}`}
              >
                Мастер
              </button>
              <button
                onClick={() => setViewAsPlayer(true)}
                className={`rounded-full px-3 py-1.5 transition ${viewAsPlayer ? "bg-accent font-semibold text-slate-950" : "text-slate-300"}`}
              >
                Вид игрока
              </button>
            </div>
          )}
        </div>
        {masterMode && (
          <button
            onClick={() => {
              setPlacing((v) => !v);
              setContextMenu(null);
            }}
            className={`btn h-10 rounded-full px-4 shadow-xl ${placing ? "bg-amber-400 text-slate-950" : "bg-accent-2 text-slate-950 hover:bg-fuchsia-300"}`}
          >
            {placing ? "✕ Отменить" : "📍 Добавить метку"}
          </button>
        )}
        <button onClick={() => setLegendOpen((v) => !v)} className="panel h-10 rounded-full px-4 text-sm hover:border-slate-500">
          ☰ Легенда
        </button>
        {legendOpen && (
          <div className="panel scrollbar-thin max-h-[50vh] w-64 overflow-y-auto p-3">
            <p className="label">Типы меток на карте</p>
            {typesOnMap.length === 0 && <p className="text-sm text-slate-500">Меток пока нет</p>}
            {typesOnMap.map(({ type, count }) => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel-2 ${
                  activeTypes.size > 0 && !activeTypes.has(type.id) ? "opacity-40" : ""
                }`}
              >
                <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} size={22} />
                <span className="flex-1 truncate">{type.name}</span>
                <span className="text-xs text-slate-500">{count}</span>
              </button>
            ))}
            {activeTypes.size > 0 && (
              <button onClick={() => setActiveTypes(new Set())} className="mt-2 w-full text-xs text-accent hover:underline">
                Показать все
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- zoom controls (bottom-right) ---- */}
      <div
        className={`absolute bottom-6 right-3 z-[1100] flex-col overflow-hidden rounded-xl border border-line bg-panel/95 shadow-xl ${
          panelOpen ? "hidden sm:flex" : "flex"
        }`}
      >
        <button onClick={() => leafletMap?.zoomIn()} className="h-10 w-10 text-lg hover:bg-panel-2" aria-label="Приблизить">+</button>
        <button onClick={() => leafletMap?.zoomOut()} className="h-10 w-10 border-t border-line text-lg hover:bg-panel-2" aria-label="Отдалить">−</button>
        <button
          onClick={() => map && leafletMap?.flyToBounds(L.latLngBounds([-map.height, 0], [0, map.width]), { duration: 0.5 })}
          className="h-10 w-10 border-t border-line text-sm hover:bg-panel-2"
          aria-label="Показать всю карту"
          title="Вся карта"
        >
          ⤢
        </button>
      </div>

      {/* ---- status bar (bottom-left) ---- */}
      <div className={`absolute bottom-6 z-[1050] flex items-center gap-2 transition-all ${panelOpen ? "left-3 sm:left-[424px]" : "left-3"}`}>
        <span className="chip bg-panel/95 px-3 py-1 shadow-lg">
          📍 {visibleMarkers.length}
          {masterMode && hiddenCount > 0 && <span className="text-amber-300"> · ◌ {hiddenCount} скрыто</span>}
        </span>
        {!isMaster && <span className="chip bg-panel/95 px-3 py-1 shadow-lg">Режим игрока</span>}
        {viewAsPlayer && <span className="rounded-full border border-cyan-400/50 bg-cyan-950/90 px-3 py-1 text-xs text-cyan-100 shadow-lg">Так карту видят игроки</span>}
      </div>

      {placing && (
        <div className="absolute left-1/2 top-20 z-[1100] -translate-x-1/2 rounded-full border border-amber-400/50 bg-amber-950/90 px-4 py-2 text-sm text-amber-100 shadow-xl">
          Кликните на карту, чтобы поставить метку · Esc — отмена
        </div>
      )}

      {/* ---- right-click menu ---- */}
      {contextMenu && (
        <div className="panel absolute z-[1200] w-56 p-1 text-sm" style={{ left: contextMenu.left, top: contextMenu.top }}>
          {masterMode && (
            <button
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-panel-2"
              onClick={() => {
                setPanel({ kind: "create", x: contextMenu.x, y: contextMenu.y });
                setContextMenu(null);
              }}
            >
              📍 Добавить метку здесь
            </button>
          )}
          <button
            className="w-full rounded-lg px-3 py-2 text-left hover:bg-panel-2"
            onClick={() => {
              navigator.clipboard?.writeText(`${Math.round(contextMenu.x)}, ${Math.round(contextMenu.y)}`);
              toast("Координаты скопированы");
              setContextMenu(null);
            }}
          >
            ⌖ {Math.round(contextMenu.x)}, {Math.round(contextMenu.y)}
          </button>
        </div>
      )}

      {/* ---- side panel (left on desktop, bottom sheet on mobile) ---- */}
      {panel && (
        <aside className="panel scrollbar-thin absolute inset-x-0 bottom-0 z-[1080] h-[62vh] overflow-y-auto rounded-b-none rounded-t-2xl p-5 sm:inset-y-0 sm:left-0 sm:right-auto sm:h-auto sm:w-[410px] sm:rounded-none sm:rounded-r-2xl sm:pt-[76px]">
          <button
            onClick={() => setPanel(null)}
            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-slate-300 hover:text-white sm:top-[76px]"
            aria-label="Закрыть панель"
          >
            ✕
          </button>
          {panel.kind === "view" && selectedMarker && (
            <MarkerDetails
              marker={selectedMarker}
              type={typeById.get(selectedMarker.typeId)}
              masterMode={masterMode}
              notes={notes.filter((n) => n.markerId === selectedMarker.id)}
              onEdit={() => setPanel({ kind: "edit", id: selectedMarker.id })}
              onToggleVisibility={() => toggleVisibility(selectedMarker)}
              onDelete={() => deleteMarker(selectedMarker)}
              onAddNote={(content) => addNote(selectedMarker.id, content)}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
            />
          )}
          {panel.kind === "edit" && selectedMarker && masterMode && (
            <>
              <h2 className="mb-4 text-lg font-semibold">Редактировать метку</h2>
              <MarkerForm
                key={selectedMarker.id}
                types={types}
                initial={selectedMarker}
                position={{ x: selectedMarker.x, y: selectedMarker.y }}
                onSubmit={(input) => updateMarker(selectedMarker.id, input)}
                onCancel={() => setPanel({ kind: "view", id: selectedMarker.id })}
              />
            </>
          )}
          {panel.kind === "create" && masterMode && (
            <>
              <h2 className="mb-4 text-lg font-semibold">Новая метка</h2>
              <MarkerForm
                key={`${panel.x}:${panel.y}`}
                types={types}
                position={{ x: panel.x, y: panel.y }}
                onSubmit={createMarker}
                onCancel={() => setPanel(null)}
              />
            </>
          )}
        </aside>
      )}
    </div>
  );

  function toggleType(id: number) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}

function TypeChip({ type, count, active, onToggle }: { type: MarkerType; count: number; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`chip shrink-0 whitespace-nowrap px-3 py-1.5 text-sm shadow-lg transition ${
        active ? "border-accent bg-accent/20 text-white" : "bg-panel/95 hover:border-slate-500"
      }`}
    >
      <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} size={18} />
      {type.name}
      <span className="text-xs text-slate-500">{count}</span>
    </button>
  );
}

// ---- Leaflet helpers --------------------------------------------------------------------------

const iconCache = new Map<string, L.DivIcon>();

function buildIcon(type: MarkerType | undefined, hidden: boolean, selected: boolean, noteCount: number): L.DivIcon {
  const shape = type?.shape ?? "PIN";
  const color = type?.color ?? "#94A3B8";
  const key = `${shape}|${color}|${type?.icon ?? ""}|${hidden}|${selected}|${noteCount > 0}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const { svg, size, anchor } = markerSvg({ shape, color, icon: type?.icon, hidden, selected });
    // A small dot shows the player that they have personal notes on this marker.
    const noteDot = noteCount > 0 ? '<span class="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border border-slate-900 bg-accent"></span>' : "";
    icon = L.divIcon({
      html: `<span class="relative block">${svg}${noteDot}</span>`,
      className: `dm-marker${hidden ? " is-hidden" : ""}${selected ? " is-selected" : ""}`,
      iconSize: size,
      iconAnchor: anchor,
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const DRAFT_ICON = (() => {
  const { svg, size, anchor } = markerSvg({ shape: "PIN", color: "#22D3EE", icon: "＋", selected: true });
  return L.divIcon({ html: svg, className: "dm-marker is-selected", iconSize: size, iconAnchor: anchor });
})();

/** Fits the image on first render and derives sensible zoom limits from its size. */
function FitToImage({ width, height }: { width: number; height: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([-height, 0], [0, width]);
    const fitZoom = map.getBoundsZoom(bounds);
    map.setMinZoom(fitZoom - 1);
    map.setMaxZoom(Math.max(fitZoom + 5, 3));
    map.fitBounds(bounds, { animate: false });
  }, [map, width, height]);
  return null;
}

function MapEvents({
  onClick,
  onContextMenu,
  onMoveStart,
}: {
  onClick: (latLng: L.LatLng) => void;
  onContextMenu: (latLng: L.LatLng, point: L.Point) => void;
  onMoveStart: () => void;
}) {
  useMapEvents({
    click: (e) => onClick(e.latlng),
    contextmenu: (e) => onContextMenu(e.latlng, e.containerPoint),
    movestart: onMoveStart,
    zoomstart: onMoveStart,
  });
  return null;
}

/** Shows the pixel position under the cursor. Kept separate so mouse moves don't re-render markers. */
function CursorReadout() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useMapEvents({
    mousemove: (e) => setPos(fromLatLng(e.latlng)),
    mouseout: () => setPos(null),
  });
  if (!pos) return null;
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1000] hidden -translate-x-1/2 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[11px] text-slate-300 sm:block">
      {Math.round(pos.x)}, {Math.round(pos.y)}
    </div>
  );
}
