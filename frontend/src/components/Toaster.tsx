"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastKind = "info" | "success" | "error";
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed top-[calc(4.25rem+var(--safe-top))] left-1/2 z-[2000] flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center gap-2 sm:top-auto sm:bottom-6 sm:w-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`cut-corners-sm pointer-events-auto border px-4 py-2 font-mono text-xs uppercase tracking-wider shadow-xl backdrop-blur ${
              t.kind === "error"
                ? "border-danger/60 bg-[#2a0710]/95 text-red-200"
                : t.kind === "success"
                  ? "border-accent/50 bg-[#03190e]/95 text-accent"
                  : "border-line-hi bg-panel/95 text-slate-100"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
