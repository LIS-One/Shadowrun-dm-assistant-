import type { MarkerShape } from "@/lib/types";
import { markerSvg } from "./markerIcon";

/** Static marker preview for legends, pickers and lists. The SVG markup is fully escaped. */
export function MarkerGlyph({
  shape,
  color,
  icon,
  hidden,
  size = 28,
}: {
  shape: MarkerShape;
  color: string;
  icon?: string | null;
  hidden?: boolean;
  size?: number;
}) {
  const { svg, size: [w, h] } = markerSvg({ shape, color, icon, hidden });
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: (size * h) / w }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
