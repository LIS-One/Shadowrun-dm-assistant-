"use client";

import { useState } from "react";
import { rollPool, secondChance, type RollResult } from "./sheet";

export interface RollRequest {
  label: string;
  pool: number;
  /** Added to the hits, e.g. the Initiative attribute for an Initiative test. */
  base?: number;
  note?: string;
}

export interface EdgeState {
  rating: number;
  current: number;
  /** Spends one point of Edge (only when the sheet is editable). */
  spend?: () => void;
}

/**
 * SR4A dice tray: hits on 5–6, glitch on half or more 1s. Edge can be spent before the roll
 * (+Edge dice, Rule of Six) or after it (Second Chance: reroll the misses), never both.
 * Give it a new `key` per request so each request rolls once on mount.
 */
export function DiceTray({ request, edge, onClose }: { request: RollRequest; edge?: EdgeState; onClose: () => void }) {
  const [pool, setPool] = useState(request.pool);
  const [threshold, setThreshold] = useState(0);
  const [result, setResult] = useState<RollResult>(() => rollPool(request.pool));

  const canSpendEdge = Boolean(edge && edge.current > 0);
  const roll = (withEdge: boolean) => {
    if (withEdge) edge?.spend?.();
    setResult(withEdge ? rollPool(pool + (edge?.rating ?? 0), { ruleOfSix: true }) : rollPool(pool));
  };
  const reroll = () => {
    edge?.spend?.();
    setResult(secondChance(result));
  };

  const total = (request.base ?? 0) + result.hits;
  const success = threshold > 0 ? result.hits >= threshold : null;

  return (
    <div className="panel fixed inset-x-0 bottom-0 z-[1300] max-h-[80dvh] overflow-y-auto border-t-accent/50 p-4 pb-[calc(1rem+var(--safe-bottom))] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:pb-4 sm:cut-corners">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="kicker">{"// бросок"}</p>
          <p className="font-display text-lg">{request.label}</p>
          {request.note && <p className="text-xs text-muted">{request.note}</p>}
        </div>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center text-muted hover:text-white" aria-label="Закрыть">✕</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="label">Пул</span>
          <input type="number" inputMode="numeric" min={0} max={60} value={pool} onChange={(e) => setPool(Number(e.target.value))} className="input text-center font-mono" />
        </label>
        <label>
          <span className="label">Порог</span>
          <input type="number" inputMode="numeric" min={0} max={20} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="input text-center font-mono" />
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => roll(false)} className="btn-primary">Бросить</button>
        <button onClick={() => roll(true)} disabled={!canSpendEdge} className="btn-magenta" title="+Грань кубиков, шестёрки перебрасываются и добавляют успехи">
          +Грань ({edge?.rating ?? 0})
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {result.dice.map((d, i) => (
          <span
            key={i}
            title={d.exploded ? "Правило шестёрок" : d.rerolled ? "Второй шанс" : undefined}
            className={`grid h-8 w-8 place-items-center border font-mono text-sm ${
              d.value >= 5
                ? "border-accent/70 bg-accent/15 text-accent"
                : d.value === 1
                  ? "border-danger/70 bg-danger/15 text-red-300"
                  : "border-line text-muted"
            } ${d.exploded ? "ring-1 ring-accent-2" : ""} ${d.rerolled ? "border-dashed" : ""}`}
          >
            {d.value}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-display text-2xl">
          <span className="glow text-accent">{result.hits}</span> <span className="text-base text-slate-300">успех.</span>
        </p>
        {request.base !== undefined && (
          <p className="font-mono text-sm text-slate-300">
            итог: {request.base} + {result.hits} = <b className="text-accent">{total}</b>
          </p>
        )}
        {success !== null && (
          <p className={`font-mono text-sm ${success ? "text-accent" : "text-red-300"}`}>
            {success ? `✓ порог пройден, чистых успехов: ${result.hits - threshold}` : "✕ порог не пройден"}
          </p>
        )}
      </div>
      {result.criticalGlitch ? (
        <p className="mt-1 font-mono text-sm font-bold uppercase text-danger">Критический сбой!</p>
      ) : result.glitch ? (
        <p className="mt-1 font-mono text-sm font-bold uppercase text-warn">Сбой</p>
      ) : null}
      <p className="mt-1 font-mono text-[11px] text-muted">единиц: {result.ones} из {result.pool}</p>

      {!result.edgeUsed && (
        <button onClick={reroll} disabled={!canSpendEdge} className="btn-ghost mt-3 w-full">
          Второй шанс (−1 Грань)
        </button>
      )}
      {edge && <p className="mt-2 text-center font-mono text-[11px] text-muted">Грань: {edge.current} / {edge.rating}</p>}
    </div>
  );
}
