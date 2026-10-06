"use client";

import { useState } from "react";
import { rollPool, type RollResult } from "./sheet";

export interface RollRequest {
  label: string;
  pool: number;
}

/**
 * Floating Shadowrun dice tray: counts hits (5–6) and detects (critical) glitches.
 * Give it a new `key` per request so each request rolls once on mount.
 */
export function DiceTray({ request, onClose }: { request: RollRequest | null; onClose: () => void }) {
  const [pool, setPool] = useState(request?.pool ?? 6);
  const [result, setResult] = useState<RollResult | null>(() => (request ? rollPool(request.pool) : null));
  const label = request?.label ?? "Свободный бросок";

  return (
    <div className="panel fixed bottom-4 right-4 z-[1300] w-[min(360px,calc(100vw-32px))] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">🎲 {label}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Закрыть">✕</button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={60}
          value={pool}
          onChange={(e) => setPool(Number(e.target.value))}
          className="input w-20 text-center"
          aria-label="Размер пула"
        />
        <span className="text-sm text-slate-400">к6</span>
        <button onClick={() => setResult(rollPool(pool))} className="btn-primary ml-auto">Бросить</button>
      </div>
      {result && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {result.dice.map((d, i) => (
              <span
                key={i}
                className={`grid h-7 w-7 place-items-center rounded-md border font-mono text-sm ${
                  d >= 5 ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200" : d === 1 ? "border-red-500/60 bg-red-500/15 text-red-300" : "border-line text-slate-400"
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          <p className="mt-3 text-lg font-semibold">
            Успехов: <span className="text-emerald-300">{result.hits}</span>
            <span className="ml-3 text-sm font-normal text-slate-500">единиц: {result.ones}</span>
          </p>
          {result.criticalGlitch ? (
            <p className="text-sm font-semibold text-red-400">Критический сбой!</p>
          ) : result.glitch ? (
            <p className="text-sm font-semibold text-amber-300">Сбой</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
