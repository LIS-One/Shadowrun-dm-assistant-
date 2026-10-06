"use client";

import dynamic from "next/dynamic";
import { use } from "react";

// Leaflet touches `window` at import time, so the viewer is loaded on the client only.
const MapViewer = dynamic(() => import("@/components/map/MapViewer"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 grid place-items-center bg-bg text-slate-400">Загрузка карты…</div>,
});

export default function MapPage(props: PageProps<"/campaigns/[campaignId]/maps/[mapId]">) {
  const { campaignId, mapId } = use(props.params);
  return <MapViewer campaignId={Number(campaignId)} mapId={Number(mapId)} />;
}
