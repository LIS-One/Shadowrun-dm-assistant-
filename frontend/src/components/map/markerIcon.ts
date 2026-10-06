import type { MarkerShape } from "@/lib/types";

/** Marker artwork shared by the Leaflet icons and the React previews (legend, type picker). */

export const SHAPE_LABELS: Record<MarkerShape, string> = {
  CIRCLE: "Круг",
  SQUARE: "Квадрат",
  DIAMOND: "Ромб",
  TRIANGLE: "Треугольник",
  HEXAGON: "Шестиугольник",
  STAR: "Звезда",
  PIN: "Булавка",
  SHIELD: "Щит",
};

export const SHAPES = Object.keys(SHAPE_LABELS) as MarkerShape[];

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 16.5 : 7.5;
  const a = (Math.PI / 5) * i - Math.PI / 2;
  return `${(18 + r * Math.cos(a)).toFixed(1)},${(19 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

interface ShapeGeometry {
  body: string;
  width: number;
  height: number;
  /** Where the icon glyph sits. */
  glyphY: number;
  /** Pixel of the shape that sits exactly on the map coordinate. */
  anchor: [number, number];
}

function geometry(shape: MarkerShape): ShapeGeometry {
  const centered = (body: string, glyphY = 18): ShapeGeometry => ({ body, width: 36, height: 36, glyphY, anchor: [18, 18] });
  switch (shape) {
    case "CIRCLE":
      return centered('<circle cx="18" cy="18" r="14.5"/>');
    case "SQUARE":
      return centered('<rect x="4" y="4" width="28" height="28" rx="6"/>');
    case "DIAMOND":
      return centered('<polygon points="18,1.5 34.5,18 18,34.5 1.5,18"/>');
    case "TRIANGLE":
      return centered('<polygon points="18,2.5 34.5,32 1.5,32" stroke-linejoin="round"/>', 22);
    case "HEXAGON":
      return centered('<polygon points="31,10.5 31,25.5 18,33 5,25.5 5,10.5 18,3"/>');
    case "STAR":
      return centered(`<polygon points="${STAR_POINTS}" stroke-linejoin="round"/>`, 20);
    case "SHIELD":
      return centered('<path d="M18 2 L32 7 V17 C32 26 26 31.5 18 34.5 C10 31.5 4 26 4 17 V7 Z"/>', 17);
    case "PIN":
      return {
        body: '<path d="M18 1.5 C9.4 1.5 2.5 8.4 2.5 17 C2.5 28.5 18 42.5 18 42.5 C18 42.5 33.5 28.5 33.5 17 C33.5 8.4 26.6 1.5 18 1.5 Z"/>',
        width: 36,
        height: 44,
        glyphY: 17,
        anchor: [18, 42.5],
      };
  }
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function safeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#94A3B8";
}

export interface MarkerSvgOptions {
  shape: MarkerShape;
  color: string;
  icon?: string | null;
  hidden?: boolean;
  selected?: boolean;
}

/**
 * Builds the SVG markup for a marker. Everything user-controlled is escaped because Leaflet
 * injects divIcon HTML with innerHTML.
 */
export function markerSvg({ shape, color, icon, hidden, selected }: MarkerSvgOptions): {
  svg: string;
  size: [number, number];
  anchor: [number, number];
} {
  const g = geometry(shape);
  const stroke = selected ? "#22d3ee" : "#ffffff";
  const dash = hidden ? ' stroke-dasharray="4 3"' : "";
  const glyph = icon
    ? `<text x="18" y="${g.glyphY}" text-anchor="middle" dominant-baseline="central" font-size="15">${escapeHtml(icon)}</text>`
    : "";
  // A small crossed-eye badge tells masters at a glance that players can't see this marker.
  const hiddenBadge = hidden
    ? '<g transform="translate(27 1)"><circle cx="5" cy="5" r="6" fill="#0f1522" stroke="#fbbf24" stroke-width="1.5"/>' +
      '<path d="M1.5 5 Q5 1.5 8.5 5 Q5 8.5 1.5 5 Z" fill="none" stroke="#fbbf24" stroke-width="1.1"/>' +
      '<line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="#fbbf24" stroke-width="1.3"/></g>'
    : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}">` +
    `<g fill="${safeColor(color)}" stroke="${stroke}" stroke-width="2.2"${dash}>${g.body}</g>` +
    glyph +
    hiddenBadge +
    "</svg>";
  return { svg, size: [g.width, g.height], anchor: g.anchor };
}
