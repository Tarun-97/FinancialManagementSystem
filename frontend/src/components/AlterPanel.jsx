import React, { useEffect, useMemo, useState } from "react";
import { get, post } from "../lib/api.js";

const TYPES = [
  "VARCHAR(50)","VARCHAR(100)","VARCHAR(200)","TEXT",
  "INT","BIGINT","DECIMAL(18,2)","DATE","DATETIME","TIMESTAMP","BOOLEAN"
];

export default function AlterPanel({ open, onClose, table, onApplied }) {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [op, setOp] = useState("addColumn");
  const [form, setForm] = useState({
    newTableName: "",
    columnName: "",
    dataType: "VARCHAR(50)",
    nullable: true,
    defaultValue: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadCols() {
      if (!open) return;
      setLoading(true); setError(null);
      try {
        const res = await get(`/ddl/${table}/columns`);
        setColumns(res.columns || []);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    loadCols();
  }, [open, table]);

  const canApply = useMemo(() => {
    if (op === "renameTable") return !!form.newTableName;
    if (op === "addColumn") return !!form.columnName && !!form.dataType;
    if (op === "modifyColumn") return !!form.columnName && !!form.dataType;
    if (op === "dropColumn") return !!form.columnName;
    return false;
  }, [op, form]);

  if (!open) return null;

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const payload =
        op === "renameTable" ? { newTableName: form.newTableName }
        : op === "addColumn" ? {
            columnName: form.columnName,
            dataType: form.dataType,
            nullable: !!form.nullable,
            defaultValue: form.defaultValue
          }
        : op === "modifyColumn" ? {
            columnName: form.columnName,
            dataType: form.dataType,
            nullable: !!form.nullable,
            defaultValue: form.defaultValue
          }
        : op === "dropColumn" ? { columnName: form.columnName }
        : {};
      const res = await post(`/ddl/${table}/alter`, { action: op, payload });
      setResult(res);
      if (typeof onApplied === "function") onApplied();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" role="presentation">
      <div className="modal">
        <div className="modalCard" role="dialog" aria-modal="true" aria-label={`Alter ${table}`}>
          <div className="modalHeader">
            <h4 className="modalTitle">Alter {table}</h4>
            <button type="button" className="btnClose" onClick={onClose}>Close</button>
          </div>

          <div className="modalBody">
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ gridColumn: "1 / span 2" }}>
                <span className="label">Operation</span>
                <select value={op} onChange={e => setOp(e.target.value)}>
                  <option value="addColumn">Add column</option>
                  <option value="modifyColumn">Modify column</option>
                  <option value="dropColumn">Drop column</option>
                  <option value="renameTable">Rename table</option>
                </select>
              </label>

              {op === "renameTable" && (
                <label style={{ gridColumn: "1 / span 2" }}>
                  <span className="label">New table name</span>
                  <input
                    value={form.newTableName}
                    onChange={e=>setForm({...form, newTableName: e.target.value})}
                    placeholder={`${table}_new`}
                  />
                </label>
              )}

              {(op === "modifyColumn" || op === "dropColumn") && (
                <label>
                  <span className="label">Column</span>
                  <select
                    value={form.columnName}
                    onChange={e=>setForm({...form, columnName: e.target.value})}
                  >
                    <option value="">-- choose existing column --</option>
                    {columns.map(c => <option key={c.Field} value={c.Field}>{c.Field}</option>)}
                  </select>
                </label>
              )}

              {op === "addColumn" && (
                <label>
                  <span className="label">New column name</span>
                  <input
                    value={form.columnName}
                    onChange={e=>setForm({...form, columnName: e.target.value})}
                    placeholder="e.g., DemoField"
                  />
                </label>
              )}

              {(op === "addColumn" || op === "modifyColumn") && (
                <>
                  <label>
                    <span className="label">Data type</span>
                    <select
                      value={form.dataType}
                      onChange={e=>setForm({...form, dataType: e.target.value})}
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <label className="field inline" style={{ alignItems:"center" }}>
                    <span className="label">Nullable</span>
                    <input
                      type="checkbox"
                      checked={form.nullable}
                      onChange={e=>setForm({...form, nullable: e.target.checked})}
                      style={{ width: 18, height: 18 }}
                    />
                  </label>

                  <label style={{ gridColumn: "1 / span 2" }}>
                    <span className="label">Default value (optional)</span>
                    <input
                      value={form.defaultValue}
                      onChange={e=>setForm({...form, defaultValue: e.target.value})}
                      placeholder="leave blank to skip"
                    />
                  </label>
                </>
              )}
            </div>

            {loading && <div className="mt-12">Loading columns...</div>}
            {error && <div className="mt-12" style={{ color: "#fca5a5" }}>{error}</div>}
            {result && (
              <pre className="mt-12" style={{ maxHeight: 240, overflow: "auto" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}

            <div className="mt-12" style={{ fontSize: 12, color: "var(--muted)" }}>
              Warning: Renaming or dropping columns can break pages and APIs referencing old names.
            </div>
          </div>

          <div className="modalFooter">
            <button onClick={run} disabled={busy || !canApply} className="btn primary">
              {busy ? "Applying..." : "Apply"}
            </button>
            <button onClick={onClose} type="button" className="btn">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
