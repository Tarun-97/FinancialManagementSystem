/* frontend/src/pages/VisualBuilder.jsx */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { get, post } from "../lib/api.js";
import Table from "../components/Table.jsx";
import { normalizeRow } from "../lib/format.js";

const SAFE_OPS = [
  { v: "=", label: "=" },
  { v: "<>", label: "<>" },
  { v: ">", label: ">" },
  { v: "<", label: "<" },
  { v: ">=", label: ">=" },
  { v: "<=", label: "<=" },
  { v: "LIKE", label: "LIKE" }
];
const SAFE_JOIN_TYPES = ["INNER", "LEFT", "RIGHT"];

/* Right slide-in panel aligned with your CSS (sheet/panel classes) */
function RightPanel({ open, title, onClose, children }) {
  return (
    <div
      id="mv-right-panel"
      className={open ? "sheet" : "hide"}
      aria-hidden={!open}
    >
      {open && (
        <>
          <div className="modalHeader">
            <h3 className="modalTitle">{title}</h3>
            <button className="btnClose" onClick={onClose}>Done</button>
          </div>
          <div className="modalBody">
            {children}
          </div>
          <div className="modalFooter">
            <button className="btn btnDone" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </div>
  );
}

/* Generic dropdown popover using your .dropdown styles */
function Dropdown({ open, onClose, children, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className="dropdown"
      role="dialog"
      aria-modal="true"
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        minWidth: 300,
        maxHeight: 380,
        overflow: "auto",
        ...style
      }}
    >
      {children}
    </div>
  );
}

/* Per-table column picker dropdown */
function TableColumnsDropdown({ table, cols, picked, onPick, open, onClose }) {
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  return (
    <Dropdown open={open} onClose={onClose}>
      <div className="label" style={{ marginBottom: 6 }}>{table} columns</div>
      <div>
        {cols.map((c) => (
          <label key={`${table}.${c.columnName}`} className="controlRow" style={{ justifyContent: "flex-start" }}>
            <input
              type="checkbox"
              checked={pickedSet.has(c.columnName)}
              onChange={() => {
                const next = new Set(pickedSet);
                if (next.has(c.columnName)) next.delete(c.columnName); else next.add(c.columnName);
                onPick(table, Array.from(next));
              }}
              style={{ width: 16, height: 16 }}
            />
            <span>
              {c.columnName} <small className="muted">({c.dataType})</small>
            </span>
          </label>
        ))}
      </div>
      <div style={{ textAlign: "right", marginTop: 8 }}>
        <button className="btn btnDone" onClick={onClose}>Done</button>
      </div>
    </Dropdown>
  );
}

/* Utility to compute query fields for a (future) query dropdown from selects/columns */
function toFieldList(selects) {
  if (!Array.isArray(selects) || !selects.length) return [];
  return selects.map(s => s.alias || `${s.table}.${s.column}`);
}

export default function VisualBuilder() {
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]); // [{tableName,columnName,dataType}]

  const [tablePanelOpen, setTablePanelOpen] = useState(false);
  const [baseTable, setBaseTable] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);

  const [selects, setSelects] = useState([]); // [{table,column,alias}]
  const [joins, setJoins] = useState([]);     // [{type, table, on:[{left:{table,column},op,right:{table,column}}]}]
  const [filters, setFilters] = useState([]); // [{table,column,op,value,valueType}]
  const [groupBy, setGroupBy] = useState([]); // ["Table.Column"]
  const [having, setHaving] = useState([]);   // like filters
  const [orderBy, setOrderBy] = useState([]); // [{table,column,dir}]
  const [limit, setLimit] = useState(200);

  const [preview, setPreview] = useState({ sql: "", rows: [] });
  const [previewOk, setPreviewOk] = useState(false);
  const [viewName, setViewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [colDropdownOpen, setColDropdownOpen] = useState({}); // { [table]: boolean }

  useEffect(() => {
    (async () => {
      try {
        const res = await get("/dbuilder/tables");
        setTables(res.items || []);
      } catch (e) {
        setMsg(e.message || "Failed to load tables");
      }
    })();
  }, []);

  const tableCols = (t) => columns.filter((c) => c.tableName === t);

  const ensureColumnsLoaded = async (tablesArr) => {
    try {
      const res = await post("/dbuilder/columns", { tables: tablesArr });
      setColumns(res.items || []);
    } catch (e) {
      setMsg(e.message || "Failed to load columns");
    }
  };

  const onOpenTablePanel = () => setTablePanelOpen(true);
  const onCloseTablePanel = async () => {
    const union = Array.from(new Set([baseTable, ...selectedTables].filter(Boolean)));
    await ensureColumnsLoaded(union);
    setSelects(prev => {
      const next = [...prev];
      const presentByTable = new Set(prev.map(s => s.table));
      union.forEach(t => {
        if (!presentByTable.has(t)) {
          tableCols(t).forEach(c => next.push({ table: t, column: c.columnName, alias: "" }));
        }
      });
      return next.filter(s => union.includes(s.table));
    });
    setTablePanelOpen(false);
    setPreviewOk(false);
    setPreview({ sql: "", rows: [] });
  };

  const toggleTableCheck = (t) => {
    setSelectedTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const setBaseAndFocus = (t) => {
    setBaseTable(t);
    if (t && !selectedTables.includes(t)) setSelectedTables(prev => [t, ...prev]);
  };

  const onPickSelectColumns = (tableName, pickedCols) => {
    const rest = selects.filter((s) => s.table !== tableName);
    const next = pickedCols.map((c) => ({ table: tableName, column: c, alias: "" }));
    setSelects([...rest, ...next]);
    setPreviewOk(false);
    setPreview({ sql: "", rows: [] });
  };

  const pickedColsFor = (t) => selects.filter(s => s.table === t).map(s => s.column);

  const addJoin = () => setJoins([...joins, { type: "INNER", table: "", on: [] }]);
  const addJoinCondition = (idx) => {
    const j = [...joins];
    const leftTable = baseTable || selectedTables[0] || "";
    j[idx].on = [...(j[idx].on || []), { left: { table: leftTable, column: "" }, op: "=", right: { table: "", column: "" } }];
    setJoins(j);
  };

  const addFilter = () =>
    setFilters([...filters, { table: baseTable || selectedTables[0] || "", column: "", op: "=", value: "", valueType: "string" }]);
  const addHaving = () =>
    setHaving([...having, { table: baseTable || selectedTables[0] || "", column: "", op: "=", value: "", valueType: "number" }]);
  const addOrder = () =>
    setOrderBy([...orderBy, { table: baseTable || selectedTables[0] || "", column: "", dir: "ASC" }]);

  const selectedTablesSet = new Set([baseTable, ...selectedTables.filter(Boolean)]);
  const invalidSelects = selects.some(s => !s.table || !s.column || !selectedTablesSet.has(s.table));
  const invalidJoin = joins.some(j =>
    !j.table ||
    !Array.isArray(j.on) || j.on.length === 0 ||
    j.on.some(c =>
      !c.left?.table || !c.left?.column ||
      !c.right?.table || !c.right?.column ||
      !SAFE_OPS.find(o => o.v === String(c.op || "=").toUpperCase())
    )
  );
  const invalidFilter = (arr) => arr.some(f => {
    if (!f.table || !f.column) return true;
    const opOk = !!SAFE_OPS.find(o => o.v === String(f.op || "=").toUpperCase());
    if (!opOk) return true;
    const vt = String(f.valueType || "string").toLowerCase();
    if (!["string", "number", "null"].includes(vt)) return true;
    if (vt === "number" && !Number.isFinite(Number(f.value))) return true;
    return false;
  });
  const invalidOrder = orderBy.some(o => !o.table || !o.column || !["ASC", "DESC"].includes(String(o.dir).toUpperCase()));

  const canPreview = useMemo(
    () => Boolean(baseTable) && !invalidSelects && !invalidJoin && !invalidFilter(filters) && !invalidFilter(having) && !invalidOrder,
    [baseTable, invalidSelects, invalidJoin, filters, having, invalidOrder]
  );

  const builderPayload = () => ({
    baseTable,
    selects,
    joins,
    filters,
    orderBy,
    limit: Math.min(200, Math.max(1, Number(limit) || 200))
  });

  const setPreviewResult = (res) => {
    const autoTypeMap = {};
    (res.rows?.[0] ? Object.keys(res.rows[0]) : []).forEach(k => {
      const L = k.toLowerCase();
      if (L.includes("date") || L.includes("time")) autoTypeMap[k] = "datetime";
      if (L.includes("amount") || L.includes("total")) autoTypeMap[k] = "decimal";
    });
    const normalized = Array.isArray(res.rows) ? res.rows.map(r => normalizeRow(r, autoTypeMap)) : [];
    setPreview({ sql: res.sql, rows: normalized });
    setPreviewOk(true);
  };

  const doPreview = async () => {
    if (!canPreview) return;
    setLoading(true);
    setMsg("");
    setPreviewOk(false);
    try {
      const res = await post("/dbuilder/preview", builderPayload());
      setPreviewResult(res);
    } catch (e) {
      setMsg(e.message || "Preview failed");
      setPreview({ sql: "", rows: [] });
      setPreviewOk(false);
    } finally {
      setLoading(false);
    }
  };

  const doCreateView = async () => {
    if (!previewOk || !viewName) return;
    setLoading(true);
    setMsg("");
    try {
      await post("/dbuilder/create-view", { viewName, builderPayload: builderPayload() });
      setMsg(`View '${viewName}' created`);
    } catch (e) {
      setMsg(e.message || "Create view failed");
    } finally {
      setLoading(false);
    }
  };

  const queryFields = useMemo(() => {
    const sel = toFieldList(selects);
    if (sel.length) return sel;
    const set = new Set();
    selectedTables.forEach(t => tableCols(t).forEach(c => set.add(`${t}.${c.columnName}`)));
    return Array.from(set);
  }, [selects, selectedTables, columns]);

  return (
    <div className="container" id="mv-root">
      {/* Toolbar */}
      <div className="card" id="mv-toolbar">
        <div className="sectionHeader">
          <h2>Table View Builder</h2>
          <small className="muted">Build a view in the browser before saving</small>
        </div>
        <div className="controlRow" style={{ flexWrap: "wrap" }}>
          <button className="btn btnColumns" onClick={() => setTablePanelOpen(true)}>Add tables</button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="field inline">
              <label htmlFor="vb-limit" className="label">Limit</label>
              <input
                id="vb-limit"
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => { setLimit(e.target.value); setPreviewOk(false); }}
                style={{ width: 110 }}
              />
            </div>
          </div>
        </div>
        {msg && <div className="alert alert-error" id="mv-error"><strong>Error:</strong> {msg}</div>}
      </div>

      {/* Per-table column selectors */}
      <div className="controlRow" style={{ gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        {selectedTables.map((t) => {
          const cols = tableCols(t);
          const picked = pickedColsFor(t);
          const isOpen = !!colDropdownOpen[t];
          return (
            <div key={`pick-${t}`} className="card" style={{ padding: 12, minWidth: 300, position: "relative" }}>
              <div className="controlRow" style={{ justifyContent: "space-between" }}>
                <div className="badge purpleB">{t}</div>
                <div className="controlRow">
                  <button
                    className="btn btnColumns"
                    onClick={() => setColDropdownOpen(prev => ({ ...prev, [t]: !prev[t] }))}
                  >
                    Columns
                  </button>
                  <small className="muted">
                    {picked.length ? `${picked.length} selected` : "all selected"}
                  </small>
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <TableColumnsDropdown
                  table={t}
                  cols={cols}
                  picked={picked.length ? picked : cols.map(c => c.columnName)}
                  onPick={onPickSelectColumns}
                  open={isOpen}
                  onClose={() => setColDropdownOpen(prev => ({ ...prev, [t]: false }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Query controls */}
      <div className="card" id="mv-query">
        <h3 className="m-0">Query Panel</h3>

        {/* Joins */}
        <div className="card" id="mv-joins" style={{ marginTop: 12 }}>
          <div className="controlRow" style={{ justifyContent: "space-between" }}>
            <div className="badge cyanA">Joins</div>
            <button className="btn btnAdd" onClick={addJoin}>Add Join</button>
          </div>
          {joins.map((j, idx) => (
            <div key={`join-${idx}`} className="card" style={{ marginTop: 10 }}>
              <div className="controlRow" style={{ flexWrap: "wrap" }}>
                <select
                  value={j.type}
                  onChange={(e) => {
                    const copy = [...joins];
                    copy[idx].type = e.target.value;
                    setJoins(copy);
                  }}
                >
                  {SAFE_JOIN_TYPES.map((t) => (
                    <option key={`jt-${t}`} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={j.table}
                  onChange={(e) => {
                    const copy = [...joins];
                    copy[idx].table = e.target.value;
                    setJoins(copy);
                  }}
                >
                  <option value="">Join table</option>
                  {selectedTables.filter(t => t !== baseTable).map(t => (
                    <option key={`jt-${t}`} value={t}>{t}</option>
                  ))}
                </select>
                <button className="btn btnApply" onClick={() => addJoinCondition(idx)} disabled={!j.table}>+ ON</button>
              </div>

              {(j.on || []).map((c, cidx) => (
                <div key={`cond-${idx}-${cidx}`} className="controlRow" style={{ flexWrap: "wrap", marginTop: 8 }}>
                  <select
                    value={c.left.table}
                    onChange={(e) => {
                      const copy = [...joins];
                      copy[idx].on[cidx].left.table = e.target.value;
                      copy[idx].on[cidx].left.column = "";
                      setJoins(copy);
                    }}
                  >
                    {selectedTables.map((t) => (
                      <option key={`l-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={c.left.column}
                    onChange={(e) => {
                      const copy = [...joins];
                      copy[idx].on[cidx].left.column = e.target.value;
                      setJoins(copy);
                    }}
                  >
                    <option value="">column</option>
                    {tableCols(c.left.table).map(col => (
                      <option key={`lc-${col.columnName}`} value={col.columnName}>{col.columnName}</option>
                    ))}
                  </select>
                  <select
                    value={c.op}
                    onChange={(e) => {
                      const copy = [...joins];
                      copy[idx].on[cidx].op = e.target.value;
                      setJoins(copy);
                    }}
                  >
                    {SAFE_OPS.map(op => (
                      <option key={`op-${op.v}`} value={op.v}>{op.label}</option>
                    ))}
                  </select>
                  <select
                    value={c.right.table}
                    onChange={(e) => {
                      const copy = [...joins];
                      copy[idx].on[cidx].right.table = e.target.value;
                      copy[idx].on[cidx].right.column = "";
                      setJoins(copy);
                    }}
                  >
                    {selectedTables.map((t) => (
                      <option key={`r-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={c.right.column}
                    onChange={(e) => {
                      const copy = [...joins];
                      copy[idx].on[cidx].right.column = e.target.value;
                      setJoins(copy);
                    }}
                  >
                    <option value="">column</option>
                    {tableCols(c.right.table).map(col => (
                      <option key={`rc-${col.columnName}`} value={col.columnName}>{col.columnName}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* WHERE */}
        <div className="card" id="mv-where" style={{ marginTop: 12 }}>
          <div className="controlRow" style={{ justifyContent: "space-between" }}>
            <div className="badge greenT">Where</div>
            <button className="btn btnAdd" onClick={addFilter}>Add</button>
          </div>
          {filters.map((f, i) => (
            <div key={`f-${i}`} className="controlRow" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <select
                value={f.table}
                onChange={(e) => {
                  const copy = [...filters];
                  copy[i].table = e.target.value;
                  copy[i].column = "";
                  setFilters(copy);
                }}
              >
                <option value="">table</option>
                {selectedTables.map(t => (
                  <option key={`ft-${t}`} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={f.column}
                onChange={(e) => {
                  const copy = [...filters];
                  copy[i].column = e.target.value;
                  setFilters(copy);
                }}
              >
                <option value="">column</option>
                {tableCols(f.table).map(col => (
                  <option key={`fc-${col.columnName}`} value={col.columnName}>{col.columnName}</option>
                ))}
              </select>
              <select
                value={f.op}
                onChange={(e) => {
                  const copy = [...filters];
                  copy[i].op = e.target.value;
                  setFilters(copy);
                }}
              >
                {SAFE_OPS.map(op => (
                  <option key={`fop-${op.v}`} value={op.v}>{op.label}</option>
                ))}
              </select>
              <select
                value={f.valueType}
                onChange={(e) => {
                  const copy = [...filters];
                  copy[i].valueType = e.target.value;
                  if (e.target.value === "null") copy[i].value = "";
                  setFilters(copy);
                }}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="null">null</option>
              </select>
              {f.valueType !== "null" && (
                <input
                  value={f.value}
                  onChange={(e) => {
                    const copy = [...filters];
                    copy[i].value = e.target.value;
                    setFilters(copy);
                  }}
                  placeholder={f.valueType === "number" ? "number" : "value"}
                  type={f.valueType === "number" ? "number" : "text"}
                />
              )}
              <button className="btn btnClear" onClick={() => setFilters(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
        </div>

        {/* GROUP BY */}
        <div className="card" id="mv-groupby" style={{ marginTop: 12 }}>
          <div className="controlRow" style={{ justifyContent: "space-between" }}>
            <div className="badge amberD">Group By</div>
          </div>
          <div className="controlRow" style={{ flexWrap: "wrap", marginTop: 8 }}>
            <select
              multiple
              value={groupBy}
              onChange={(e) => {
                const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                setGroupBy(vals);
              }}
              className="listBox"
              style={{ minHeight: 100, minWidth: 280 }}
            >
              {selectedTables.flatMap(t =>
                tableCols(t).map(c => {
                  const key = `${t}.${c.columnName}`;
                  return (
                    <option key={key} value={key}>{key}</option>
                  );
                })
              )}
            </select>
            <div className="hint">Hold Ctrl/Cmd to pick multiple group keys.</div>
          </div>
        </div>

        {/* HAVING */}
        <div className="card" id="mv-having" style={{ marginTop: 12 }}>
          <div className="controlRow" style={{ justifyContent: "space-between" }}>
            <div className="badge amberD">Having</div>
            <button className="btn btnAdd" onClick={addHaving}>Add</button>
          </div>
          {having.map((f, i) => (
            <div key={`h-${i}`} className="controlRow" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <select
                value={f.table}
                onChange={(e) => {
                  const copy = [...having];
                  copy[i].table = e.target.value;
                  copy[i].column = "";
                  setHaving(copy);
                }}
              >
                <option value="">table</option>
                {selectedTables.map(t => (
                  <option key={`ht-${t}`} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={f.column}
                onChange={(e) => {
                  const copy = [...having];
                  copy[i].column = e.target.value;
                  setHaving(copy);
                }}
              >
                <option value="">column</option>
                {tableCols(f.table).map(col => (
                  <option key={`hc-${col.columnName}`} value={col.columnName}>{col.columnName}</option>
                ))}
              </select>
              <select
                value={f.op}
                onChange={(e) => {
                  const copy = [...having];
                  copy[i].op = e.target.value;
                  setHaving(copy);
                }}
              >
                {SAFE_OPS.map(op => (
                  <option key={`hop-${op.v}`} value={op.v}>{op.label}</option>
                ))}
              </select>
              <select
                value={f.valueType}
                onChange={(e) => {
                  const copy = [...having];
                  copy[i].valueType = e.target.value;
                  if (e.target.value === "null") copy[i].value = "";
                  setHaving(copy);
                }}
              >
                <option value="number">number</option>
                <option value="string">string</option>
                <option value="null">null</option>
              </select>
              {f.valueType !== "null" && (
                <input
                  value={f.value}
                  onChange={(e) => {
                    const copy = [...having];
                    copy[i].value = e.target.value;
                    setHaving(copy);
                  }}
                  placeholder={f.valueType === "number" ? "number" : "value"}
                  type={f.valueType === "number" ? "number" : "text"}
                />
              )}
              <button className="btn btnClear" onClick={() => setHaving(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
        </div>

        {/* ORDER BY */}
        <div className="card" id="mv-orderby" style={{ marginTop: 12 }}>
          <div className="controlRow" style={{ justifyContent: "space-between" }}>
            <div className="badge cyanA">Order By</div>
            <button className="btn btnAdd" onClick={addOrder}>Add</button>
          </div>
          {orderBy.map((o, i) => (
            <div key={`o-${i}`} className="controlRow" style={{ flexWrap: "wrap", marginTop: 8 }}>
              <select
                value={o.table}
                onChange={(e) => {
                  const c = [...orderBy];
                  c[i].table = e.target.value;
                  c[i].column = "";
                  setOrderBy(c);
                }}
              >
                <option value="">table</option>
                {selectedTables.map(t => (
                  <option key={`ot-${t}`} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={o.column}
                onChange={(e) => {
                  const c = [...orderBy];
                  c[i].column = e.target.value;
                  setOrderBy(c);
                }}
              >
                <option value="">column</option>
                {tableCols(o.table).map(col => (
                  <option key={`oc-${col.columnName}`} value={col.columnName}>{col.columnName}</option>
                ))}
              </select>
              <select
                value={o.dir}
                onChange={(e) => {
                  const c = [...orderBy];
                  c[i].dir = e.target.value;
                  setOrderBy(c);
                }}
              >
                <option value="ASC">ASC</option>
                <option value="DESC">DESC</option>
              </select>
              <button className="btn btnClear" onClick={() => setOrderBy(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="controlRow" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn btnQuery" onClick={doPreview} disabled={loading || !canPreview}>
            {loading ? "Preview..." : "Preview"}
          </button>
          <input
            id="mv-view-name"
            placeholder="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <button
            className="btn primary"
            onClick={doCreateView}
            disabled={loading || !previewOk || !viewName}
            title={!previewOk ? "Run Preview first" : ""}
          >
            Create View
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="card" id="mv-preview" style={{ marginTop: 12 }}>
        <h3 className="m-0">Preview</h3>
        {preview.sql && <pre className="codeBlock">{preview.sql}</pre>}
        {Array.isArray(preview.rows) && preview.rows.length > 0 ? (() => {
          const pvCols = Object.keys(preview.rows[0] || {}).map(k => ({ key: k, header: k }));
          return <Table columns={pvCols} rows={preview.rows} />;
        })() : (
          <p className="muted">No data</p>
        )}
      </div>

      {/* Right slide-in panel */}
      <RightPanel open={tablePanelOpen} title="Select Tables" onClose={onCloseTablePanel}>
        <div className="field">
          <label className="label" htmlFor="mv-base-table">Base Table</label>
          <select
            id="mv-base-table"
            value={baseTable}
            onChange={(e) => setBaseAndFocus(e.target.value)}
          >
            <option value="">Select base</option>
            {tables.map(t => (
              <option key={`b-${t.tableName}`} value={t.tableName}>{t.tableName}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginTop: 10 }}>
          <label className="label">Additional Tables</label>
          <div className="grid auto">
            {tables.map(t => (
              <label key={`cb-${t.tableName}`} className="controlRow" style={{ justifyContent: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={selectedTables.includes(t.tableName)}
                  onChange={() => toggleTableCheck(t.tableName)}
                  style={{ width: 16, height: 16 }}
                />
                <span>{t.tableName}</span>
              </label>
            ))}
          </div>
          <div className="hint mt-8">Pick tables, then use Columns to select fields.</div>
        </div>
      </RightPanel>
    </div>
  );
}
