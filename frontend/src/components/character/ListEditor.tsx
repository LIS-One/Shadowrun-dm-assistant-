"use client";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "checkbox" | "select";
  options?: readonly { value: string; label: string }[];
  /** Table cell width on desktop, e.g. "w-20". */
  className?: string;
  /** Take the full row in the phone card layout. */
  wide?: boolean;
  placeholder?: string;
}

/**
 * Editable list for the repeating parts of a character sheet (skills, gear, contacts…).
 * Desktop shows a compact table; phones get one card per row so nothing scrolls sideways.
 */
export function ListEditor<T extends object>({
  items,
  columns,
  onChange,
  create,
  readOnly,
  addLabel = "+ Добавить",
  emptyText = "Пусто",
  extra,
}: {
  items: T[];
  columns: Column<T>[];
  onChange: (items: T[]) => void;
  create: () => T;
  readOnly: boolean;
  addLabel?: string;
  emptyText?: string;
  extra?: (item: T, index: number) => React.ReactNode;
}) {
  const update = (index: number, key: keyof T, value: unknown) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  const remove = (index: number) => onChange(items.filter((_, j) => j !== index));

  const field = (item: T, i: number, c: Column<T>, compact: boolean) => {
    const value = item[c.key] as unknown;
    const base = compact
      ? "w-full border border-transparent bg-transparent px-1 py-1 outline-none hover:border-line focus:border-accent"
      : "input";
    if (c.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(e) => update(i, c.key, e.target.checked)}
          className="h-5 w-5 accent-[#3dff9e]"
          aria-label={c.label}
        />
      );
    }
    if (c.type === "select") {
      return (
        <select
          value={String(value ?? "")}
          disabled={readOnly}
          onChange={(e) => update(i, c.key, e.target.value)}
          className={`${base} disabled:opacity-100`}
          aria-label={c.label}
        >
          {c.options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-panel">{o.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={c.type === "number" ? "number" : "text"}
        inputMode={c.type === "number" ? "decimal" : undefined}
        value={value === undefined || value === null ? "" : String(value)}
        readOnly={readOnly}
        placeholder={c.placeholder}
        step={c.type === "number" ? "any" : undefined}
        onChange={(e) => update(i, c.key, c.type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)}
        className={`${base} placeholder:text-slate-600 ${compact ? "read-only:hover:border-transparent" : ""}`}
        aria-label={c.label}
      />
    );
  };

  return (
    <div>
      {items.length === 0 && <p className="py-2 text-sm italic text-muted">{emptyText}</p>}

      {items.length > 0 && (
        <>
          {/* phones: one card per row */}
          <div className="space-y-2 sm:hidden">
            {items.map((item, i) => (
              <div key={i} className="cut-corners-sm border border-line bg-bg/50 p-3">
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className={`block ${c.wide ? "col-span-2" : ""} ${c.type === "checkbox" ? "flex min-h-11 items-center gap-2" : ""}`}
                    >
                      {c.type === "checkbox" ? (
                        <>
                          {field(item, i, c, false)}
                          <span className="text-sm text-slate-300">{c.label}</span>
                        </>
                      ) : (
                        <>
                          <span className="label">{c.label}</span>
                          {field(item, i, c, false)}
                        </>
                      )}
                    </label>
                  ))}
                </div>
                {(extra || !readOnly) && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>{extra?.(item, i)}</div>
                    {!readOnly && (
                      <button onClick={() => remove(i)} className="min-h-11 px-2 font-mono text-xs uppercase text-muted hover:text-red-300">
                        Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* desktop: compact table */}
          <div className="scrollbar-thin hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                  {columns.map((c) => (
                    <th key={c.key} className={`px-1 pb-1 font-medium ${c.className ?? ""}`}>{c.label}</th>
                  ))}
                  {extra && <th className="w-16" />}
                  {!readOnly && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-line/60">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-1 py-1 ${c.className ?? ""}`}>{field(item, i, c, true)}</td>
                    ))}
                    {extra && <td className="px-1 py-1 text-right">{extra(item, i)}</td>}
                    {!readOnly && (
                      <td className="px-1 py-1 text-right">
                        <button onClick={() => remove(i)} className="text-muted hover:text-red-300" aria-label="Удалить строку">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!readOnly && (
        <button onClick={() => onChange([...items, create()])} className="mt-2 min-h-11 font-mono text-xs uppercase tracking-wider text-accent hover:underline sm:min-h-0">
          {addLabel}
        </button>
      )}
    </div>
  );
}
