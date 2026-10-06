"use client";

import { useEffect } from "react";
import { IconClose } from "./icons";

/** Centered dialog on desktop, bottom sheet on phones. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`panel max-h-[92dvh] w-full overflow-y-auto border-t-accent/60 p-5 pb-[calc(1.25rem+var(--safe-bottom))] sm:cut-corners sm:max-h-[90vh] sm:p-6 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="mx-auto mb-3 h-1 w-10 bg-line-hi sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg">{title}</h2>
          <button onClick={onClose} className="-m-2 grid h-11 w-11 place-items-center text-muted hover:text-white" aria-label="Закрыть">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
