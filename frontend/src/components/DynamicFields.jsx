import React from "react";

export default function DynamicFields({ knownKeys, columns, values, onChange, excludeTypes = [] }) {
  const rows = (columns || []).filter(c => !knownKeys.has(c.Field));

  function inputTypeFor(col) {
    const t = String(col.Type || "").toLowerCase();
    if (t.startsWith("date")) return "date";
    if (t.startsWith("datetime") || t.startsWith("timestamp")) return "date";
    if (t.startsWith("int") || t.startsWith("bigint") || t.startsWith("decimal")) return "number";
    return "text";
  }

  return (
    <>
      {rows.map(col => {
        if (excludeTypes.some(ex => (col.Type || "").toUpperCase().startsWith(ex))) return null;
        const k = col.Field;
        const type = inputTypeFor(col);
        return (
          <input
            key={k}
            placeholder={k}
            type={type}
            value={values[k] ?? ""}
            onChange={e => onChange(prev => ({ ...prev, [k]: e.target.value }))}
          />
        );
      })}
    </>
  );
}
