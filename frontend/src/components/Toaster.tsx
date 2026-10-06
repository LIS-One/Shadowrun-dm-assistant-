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
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[2000] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-2 text-sm shadow-xl backdrop-blur ${
              t.kind === "error"
                ? "border-red-500/50 bg-red-950/90 text-red-100"
                : t.kind === "success"
                  ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-100"
                  : "border-line bg-panel/95 text-slate-100"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
