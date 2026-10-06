"use client";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "checkbox" | "select";
  options?: readonly { value: string; label: string }[];
  className?: string;
  placeholder?: string;
}

/** Editable table for the repeating parts of a character sheet (skills, gear, contacts…). */
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

  return (
    <div>
      {items.length === 0 ? (
        <p className="py-2 text-sm italic text-slate-500">{emptyText}</p>
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
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
                  {columns.map((c) => {
                    const value = item[c.key] as unknown;
                    return (
                      <td key={c.key} className={`px-1 py-1 ${c.className ?? ""}`}>
                        {c.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            disabled={readOnly}
                            onChange={(e) => update(i, c.key, e.target.checked)}
                            className="h-4 w-4 accent-cyan-400"
                          />
                        ) : c.type === "select" ? (
                          <select
                            value={String(value ?? "")}
                            disabled={readOnly}
                            onChange={(e) => update(i, c.key, e.target.value)}
                            className="w-full rounded border border-transparent bg-transparent px-1 py-1 outline-none hover:border-line focus:border-accent disabled:opacity-100"
                          >
                            {c.options?.map((o) => (
                              <option key={o.value} value={o.value} className="bg-panel">{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={c.type === "number" ? "number" : "text"}
                            value={value === undefined || value === null ? "" : String(value)}
                            readOnly={readOnly}
                            placeholder={c.placeholder}
                            step={c.type === "number" ? "any" : undefined}
                            onChange={(e) =>
                              update(i, c.key, c.type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)
                            }
                            className="w-full rounded border border-transparent bg-transparent px-1 py-1 outline-none placeholder:text-slate-600 hover:border-line focus:border-accent read-only:hover:border-transparent"
                          />
                        )}
                      </td>
                    );
                  })}
                  {extra && <td className="px-1 py-1 text-right">{extra(item, i)}</td>}
                  {!readOnly && (
                    <td className="px-1 py-1 text-right">
                      <button
                        onClick={() => onChange(items.filter((_, j) => j !== i))}
                        className="text-slate-500 hover:text-red-300"
                        aria-label="Удалить строку"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!readOnly && (
        <button onClick={() => onChange([...items, create()])} className="mt-2 text-xs text-accent hover:underline">
          {addLabel}
        </button>
      )}
    </div>
  );
}
