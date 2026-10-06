"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOverlay, MapContainer, Marker as LeafletMarker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import {
  IconBack,
  IconClose,
  IconExpand,
  IconEyeOff,
  IconLayers,
  IconMinus,
  IconPin,
  IconPlus,
  IconSearch,
} from "@/components/icons";
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
  // Phone bottom sheet: which panel is expanded to full height, and the live drag offset.
  const [sheetFullFor, setSheetFullFor] = useState<string | null>(null);
  const [sheetDrag, setSheetDrag] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);

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
      // Shift the view so the marker isn't covered by the side panel (desktop) or bottom sheet (phone).
      const size = leafletMap.getSize();
      const offset = size.x < 640 ? L.point(0, size.y * 0.24) : L.point(-205, 0);
      const center = leafletMap.unproject(leafletMap.project(toLatLng(m.x, m.y), zoom).add(offset), zoom);
      leafletMap.flyTo(center, zoom, { duration: 0.6 });
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
      focusMarker(created);
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
      <div className="fixed inset-0 z-50 grid place-items-center bg-bg p-6">
        <div className="text-center">
          <p className="text-red-400">{errorMessage(mapError)}</p>
          <Link href={base} className="btn-ghost mt-4">← К картам</Link>
        </div>
      </div>
    );
  }

  const panelOpen = panel !== null;
  const panelKey = panel ? (panel.kind === "create" ? `create:${panel.x}:${panel.y}` : `${panel.kind}:${panel.id}`) : null;
  // Forms need room, so editing always opens the phone sheet fully.
  const sheetExpanded = panel !== null && (panel.kind !== "view" || sheetFullFor === panelKey);
  const sheetHeight = `calc(${sheetExpanded ? "100dvh - var(--safe-top) - 12px" : "48dvh"} - ${sheetDrag ?? 0}px)`;
  const noteCountByMarker = notes.reduce<Record<number, number>>((acc, n) => ({ ...acc, [n.markerId]: (acc[n.markerId] ?? 0) + 1 }), {});
  const showChips = typesOnMap.length > 0 || (masterMode && hiddenCount > 0);

  const chips = (
    <>
      {masterMode && hiddenCount > 0 && (
        <button
          onClick={() => setHiddenOnly((v) => !v)}
          className={`chip min-h-9 shrink-0 whitespace-nowrap px-3 shadow-lg ${hiddenOnly ? "border-warn bg-warn/20 text-warn" : "bg-panel/95"}`}
        >
          <IconEyeOff className="h-3.5 w-3.5" /> Скрытые · {hiddenCount}
        </button>
      )}
      {typesOnMap.map(({ type, count }) => (
        <TypeChip key={type.id} type={type} count={count} active={activeTypes.has(type.id)} onToggle={() => toggleType(type.id)} />
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-bg">
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
              // Keep the menu on screen on small displays.
              const left = Math.min(point.x, window.innerWidth - 240);
              const top = Math.min(point.y, window.innerHeight - 130);
              setContextMenu({ x, y, left: Math.max(8, left), top: Math.max(8, top) });
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
        <div className="grid h-full place-items-center font-mono text-sm uppercase tracking-widest text-muted">Загрузка карты…</div>
      )}

      {/* ---- top bar: search + chips (phones: full width, desktop: top-left) ---- */}
      <div className={`absolute inset-x-3 top-[calc(0.75rem+var(--safe-top))] z-[1100] sm:right-auto sm:block sm:w-[400px] ${sheetExpanded ? "hidden" : ""}`}>
        <div className="panel cut-corners-sm flex h-12 items-center gap-1 px-1 shadow-2xl">
          <Link href={base} className="grid h-11 w-11 shrink-0 place-items-center text-slate-300 hover:text-accent" title="К картам кампании" aria-label="Назад">
            <IconBack />
          </Link>
          <IconSearch className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults[0]) focusMarker(searchResults[0]);
            }}
            placeholder={map ? map.name : "Поиск…"}
            className="min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-slate-500 sm:text-sm"
            aria-label="Поиск меток"
            enterKeyHint="search"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="grid h-11 w-11 place-items-center text-muted hover:text-white" aria-label="Очистить">
              <IconClose className="h-4 w-4" />
            </button>
          ) : (
            <span className="hidden pr-3 font-mono text-xs text-slate-600 sm:inline">/</span>
          )}
        </div>
        {searchFocused && query.trim() && (
          <div className="panel cut-corners-sm mt-2 max-h-[50dvh] overflow-y-auto p-1">
            {searchResults.length === 0 && <p className="px-3 py-3 text-sm text-muted">Ничего не найдено</p>}
            {searchResults.map((m) => {
              const t = typeById.get(m.typeId);
              return (
                <button
                  key={m.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => focusMarker(m)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-panel-2"
                >
                  {t && <MarkerGlyph shape={t.shape} color={t.color} icon={t.icon} hidden={m.visibility === "HIDDEN"} size={24} />}
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{m.title}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{t?.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {/* phones and tablets: chips under the search bar */}
        {showChips && !(searchFocused && query.trim()) && (
          <div className="scrollbar-thin -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-1 xl:hidden">{chips}</div>
        )}
      </div>

      {/* desktop: chips next to the search bar */}
      {showChips && (
        <div className="scrollbar-thin absolute left-[424px] top-[calc(1rem+var(--safe-top))] z-[1050] hidden max-w-[calc(100vw-940px)] gap-2 overflow-x-auto pb-1 xl:flex">
          {chips}
        </div>
      )}

      {/* ---- right column: mode, map switcher, legend ---- */}
      <div
        className={`absolute right-3 top-[calc(7.5rem+var(--safe-top))] z-[1100] flex-col items-end gap-2 sm:top-[calc(0.75rem+var(--safe-top))] sm:flex ${
          sheetExpanded ? "hidden" : "flex"
        }`}
      >
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {allMaps && allMaps.length > 1 && (
            <select
              value={mapId}
              onChange={(e) => router.push(`${base}/maps/${e.target.value}`)}
              className="panel cut-corners-sm hidden h-11 max-w-[200px] px-3 font-mono text-xs uppercase outline-none sm:block"
              aria-label="Другая карта"
            >
              {allMaps.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {isMaster && (
            <div className="panel cut-corners-sm flex h-11 items-center p-1 font-mono text-[11px] uppercase tracking-wider" role="group" aria-label="Режим">
              <button
                onClick={() => setViewAsPlayer(false)}
                className={`h-9 px-3 transition ${!viewAsPlayer ? "bg-accent-2 font-bold text-black" : "text-slate-300"}`}
              >
                Мастер
              </button>
              <button
                onClick={() => setViewAsPlayer(true)}
                className={`h-9 px-3 transition ${viewAsPlayer ? "bg-accent font-bold text-black" : "text-slate-300"}`}
              >
                <span className="sm:hidden">Игрок</span>
                <span className="hidden sm:inline">Вид игрока</span>
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
            className={`hidden h-11 shadow-xl sm:inline-flex ${placing ? "btn bg-warn text-black" : "btn-magenta"}`}
          >
            {placing ? (<><IconClose className="h-4 w-4" /> Отменить</>) : (<><IconPin className="h-4 w-4" /> Добавить метку</>)}
          </button>
        )}
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className={`panel cut-corners-sm grid h-11 w-11 place-items-center sm:flex sm:w-auto sm:gap-2 sm:px-4 sm:font-mono sm:text-xs sm:uppercase ${legendOpen ? "border-accent text-accent" : "text-slate-200"}`}
          aria-label="Легенда"
        >
          <IconLayers className="h-5 w-5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Легенда</span>
        </button>
        {legendOpen && (
          <div className="panel cut-corners scrollbar-thin max-h-[50dvh] w-[min(280px,calc(100vw-24px))] overflow-y-auto p-3">
            <p className="label">Типы меток на карте</p>
            {typesOnMap.length === 0 && <p className="text-sm text-muted">Меток пока нет</p>}
            {typesOnMap.map(({ type, count }) => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm hover:bg-panel-2 ${
                  activeTypes.size > 0 && !activeTypes.has(type.id) ? "opacity-40" : ""
                }`}
              >
                <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} size={22} />
                <span className="flex-1 truncate">{type.name}</span>
                <span className="font-mono text-xs text-muted">{count}</span>
              </button>
            ))}
            {activeTypes.size > 0 && (
              <button onClick={() => setActiveTypes(new Set())} className="mt-2 min-h-11 w-full font-mono text-xs uppercase text-accent hover:underline">
                Показать все
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- zoom controls (desktop; phones pinch) ---- */}
      <div className="panel absolute bottom-6 right-3 z-[1100] hidden flex-col sm:flex">
        <button onClick={() => leafletMap?.zoomIn()} className="grid h-11 w-11 place-items-center hover:text-accent" aria-label="Приблизить"><IconPlus /></button>
        <button onClick={() => leafletMap?.zoomOut()} className="grid h-11 w-11 place-items-center border-t border-line hover:text-accent" aria-label="Отдалить"><IconMinus /></button>
        <button
          onClick={() => map && leafletMap?.flyToBounds(L.latLngBounds([-map.height, 0], [0, map.width]), { duration: 0.5 })}
          className="grid h-11 w-11 place-items-center border-t border-line hover:text-accent"
          aria-label="Показать всю карту"
          title="Вся карта"
        >
          <IconExpand className="h-4 w-4" />
        </button>
      </div>

      {/* ---- phone floating buttons ---- */}
      {!panelOpen && (
        <div className="absolute right-4 bottom-[calc(1rem+var(--safe-bottom))] z-[1100] flex flex-col items-end gap-3 sm:hidden">
          <button
            onClick={() => map && leafletMap?.flyToBounds(L.latLngBounds([-map.height, 0], [0, map.width]), { duration: 0.5 })}
            className="panel grid h-12 w-12 place-items-center text-slate-200"
            aria-label="Показать всю карту"
          >
            <IconExpand className="h-5 w-5" />
          </button>
          {masterMode && (
            <button
              onClick={() => {
                setPlacing((v) => !v);
                setContextMenu(null);
              }}
              className={`cut-corners grid h-16 w-16 place-items-center shadow-2xl ${placing ? "bg-warn text-black" : "bg-accent-2 text-black"}`}
              aria-label={placing ? "Отменить добавление" : "Добавить метку"}
            >
              {placing ? <IconClose className="h-7 w-7" /> : <IconPlus className="h-8 w-8" />}
            </button>
          )}
        </div>
      )}

      {/* ---- status (bottom-left) ---- */}
      <div
        className={`absolute bottom-[calc(1rem+var(--safe-bottom))] z-[1050] flex max-w-[calc(100vw-110px)] flex-wrap items-center gap-2 transition-all sm:bottom-6 ${
          panelOpen ? "hidden sm:left-[424px] sm:flex" : placing ? "left-3 hidden sm:flex" : "left-3 flex"
        }`}
      >
        <span className="chip bg-panel/95 px-3 py-1 shadow-lg">
          ◆ {visibleMarkers.length}
          {masterMode && hiddenCount > 0 && <span className="text-warn"> · {hiddenCount} скрыто</span>}
        </span>
        {!isMaster && <span className="chip border-accent/50 bg-panel/95 px-3 py-1 text-accent shadow-lg">Режим игрока</span>}
        {viewAsPlayer && <span className="chip border-info/60 bg-[#04161b]/95 px-3 py-1 text-info shadow-lg">Так видят игроки</span>}
      </div>

      {placing && (
        <div className="absolute left-3 right-24 bottom-[calc(1rem+var(--safe-bottom))] z-[1100] border border-warn/60 bg-[#1f1503]/95 px-4 py-3 text-center font-mono text-xs uppercase tracking-wider text-warn shadow-xl sm:inset-x-0 sm:top-24 sm:bottom-auto sm:mx-auto sm:max-w-md sm:py-2">
          <span className="sm:hidden">Коснитесь карты, чтобы поставить метку</span>
          <span className="hidden sm:inline">Кликните на карту, чтобы поставить метку · Esc — отмена</span>
        </div>
      )}

      {/* ---- context menu (right click / long press) ---- */}
      {contextMenu && (
        <div className="panel cut-corners-sm absolute z-[1200] w-56 p-1 text-sm" style={{ left: contextMenu.left, top: contextMenu.top }}>
          {masterMode && (
            <button
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-panel-2"
              onClick={() => {
                setPanel({ kind: "create", x: contextMenu.x, y: contextMenu.y });
                setContextMenu(null);
              }}
            >
              <IconPin className="h-4 w-4 text-accent-2" /> Добавить метку здесь
            </button>
          )}
          <button
            className="flex min-h-11 w-full items-center gap-2 px-3 text-left font-mono text-xs hover:bg-panel-2"
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

      {/* ---- marker panel: left sidebar on desktop, draggable bottom sheet on phones ---- */}
      {panel && (
        <aside
          style={{ "--sheet-h": sheetHeight } as React.CSSProperties}
          className={`panel absolute inset-x-0 bottom-0 z-[1080] flex h-[var(--sheet-h)] flex-col border-t-accent/60 sm:inset-y-0 sm:left-0 sm:right-auto sm:h-auto sm:w-[410px] sm:border-t-line sm:pt-[calc(4.5rem+var(--safe-top))] ${
            sheetDrag === null ? "transition-[height] duration-200" : ""
          }`}
        >
          {/* drag handle (phones) */}
          <div
            className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center sm:hidden"
            onPointerDown={(e) => {
              dragStartY.current = e.clientY;
              setSheetDrag(0);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (dragStartY.current !== null) setSheetDrag(e.clientY - dragStartY.current);
            }}
            onPointerUp={() => {
              const dy = sheetDrag ?? 0;
              dragStartY.current = null;
              setSheetDrag(null);
              if (dy < -50) setSheetFullFor(panelKey);
              else if (dy > 80) {
                if (sheetExpanded && panel.kind === "view") setSheetFullFor(null);
                else setPanel(null);
              } else if (Math.abs(dy) < 6 && panel.kind === "view") {
                setSheetFullFor(sheetExpanded ? null : panelKey);
              }
            }}
            onPointerCancel={() => {
              dragStartY.current = null;
              setSheetDrag(null);
            }}
            role="button"
            aria-label={sheetExpanded ? "Свернуть панель" : "Развернуть панель"}
          >
            <span className="h-1 w-12 bg-line-hi" />
          </div>
          <button
            onClick={() => setPanel(null)}
            className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center text-muted hover:text-white sm:top-[calc(4.75rem+var(--safe-top))]"
            aria-label="Закрыть панель"
          >
            <IconClose />
          </button>
          <div className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-5">
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
                <p className="kicker text-accent-2">{"// редактирование"}</p>
                <h2 className="mb-4 text-lg">Изменить метку</h2>
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
                <p className="kicker text-accent-2">{"// новая точка"}</p>
                <h2 className="mb-4 text-lg">Новая метка</h2>
                <MarkerForm
                  key={`${panel.x}:${panel.y}`}
                  types={types}
                  position={{ x: panel.x, y: panel.y }}
                  onSubmit={createMarker}
                  onCancel={() => setPanel(null)}
                />
              </>
            )}
          </div>
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
      className={`chip min-h-9 shrink-0 whitespace-nowrap px-3 normal-case tracking-normal shadow-lg transition ${
        active ? "border-accent bg-accent/15 text-accent" : "bg-panel/95 hover:border-line-hi"
      }`}
    >
      <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} size={18} />
      <span className="font-sans text-[13px]">{type.name}</span>
      <span className="text-muted">{count}</span>
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
    const noteDot = noteCount > 0 ? '<span class="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rotate-45 border border-black bg-accent"></span>' : "";
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
  const { svg, size, anchor } = markerSvg({ shape: "PIN", color: "#3DFF9E", icon: "＋", selected: true });
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
    const size = map.getSize();
    if (size.x < 640 && size.y > size.x) {
      // Portrait phones: fill the screen like a maps app instead of a thin strip in the middle.
      map.setView(bounds.getCenter(), map.getBoundsZoom(bounds, true), { animate: false });
    } else {
      map.fitBounds(bounds, { animate: false });
    }
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
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-[1000] hidden -translate-x-1/2 bg-black/70 px-2 py-0.5 font-mono text-[11px] text-accent sm:block">
      {Math.round(pos.x)}, {Math.round(pos.y)}
    </div>
  );
}
