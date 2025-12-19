import React, { useEffect, useRef, useState } from "react";
import { get } from "../lib/api.js";
import Table from "../components/Table.jsx";

// Registry of sources
const TABLES = {
  States:          { path: "/states",        label: "States" },
  Departments:     { path: "/departments",   label: "Departments" },
  FiscalYears:     { path: "/fiscal-years",  label: "Fiscal Years" },
  Budgets:         { path: "/budgets",       label: "Budgets" },
  Expenditures:    { path: "/expenditures",  label: "Expenditures" },
  ChartOfAccounts: { path: "/accounts",      label: "Chart Of Accounts" }
};

// Columns metadata
async function fetchColumns(table) {
  const res = await get(`/ddl/${table}/columns`);
  return (res.columns || []).map(c => c.Field);
}

// Helpers
const parseValue = (raw) => {
  if (raw == null) return raw;
  const t = String(raw).trim();
  if (t === "") return "";
  const n = Number(t);
  if (!Number.isNaN(n) && t !== "") return n;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return d;
  return t.toLowerCase ? t.toLowerCase() : t;
};

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
        // background, border, radius, shadow come from .dropdown CSS
        padding: 10,
        zIndex: 1000,
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

function ColumnsPicker({ colsAll, colsShown, onToggle, open, onClose }) {
  return (
    <Dropdown open={open} onClose={onClose}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Select columns</div>
      {colsAll.map(c => (
        <label key={c} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
          <input type="checkbox" checked={colsShown.has(c)} onChange={() => onToggle(c)} />
          <span>{c}</span>
        </label>
      ))}
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <button type="button" onClick={onClose} className="btn">Done</button>
      </div>
    </Dropdown>
  );
}

// Query UI and execution (Filter/Sort/Group/Aggregate)
const OPS = [
  { k: "contains", label: "contains" },
  { k: "eq", label: "=" },
  { k: "neq", label: "!=" },
  { k: "gt", label: ">" },
  { k: "gte", label: "≥" },
  { k: "lt", label: "<" },
  { k: "lte", label: "≤" },
  { k: "between", label: "between" },
  { k: "in", label: "in" }
];
const AGG_FUNS = ["count", "sum", "avg", "min", "max"];

function applyFilters(rows, filters) {
  if (!filters?.length) return rows;
  return rows.filter(r => {
    return filters.every(f => {
      const v = r[f.field];
      const pv = typeof v === "string" ? v.toLowerCase() : v;
      const a = parseValue(f.value);
      const b = parseValue(f.value2);
      switch (f.op) {
        case "contains": return String(pv ?? "").includes(String(a ?? ""));
        case "eq": return pv == a;
        case "neq": return pv != a;
        case "gt": return pv > a;
        case "gte": return pv >= a;
        case "lt": return pv < a;
        case "lte": return pv <= a;
        case "between":
          if (a instanceof Date && b instanceof Date) return new Date(v) >= a && new Date(v) <= b;
          return pv >= a && pv <= b;
        case "in":
          if (!a) return true;
          const set = new Set(String(a).split(",").map(s => s.trim().toLowerCase()));
          return set.has(String(v ?? "").toLowerCase());
        default: return true;
      }
    });
  });
}

function applySort(rows, sorts) {
  if (!sorts?.length) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const s of sorts) {
      const av = a[s.field], bv = b[s.field];
      if (av == null && bv == null) continue;
      if (av == null) return s.dir === "asc" ? -1 : 1;
      if (bv == null) return s.dir === "asc" ? 1 : -1;
      if (av < bv) return s.dir === "asc" ? -1 : 1;
      if (av > bv) return s.dir === "asc" ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

function runAgg(rows, groupBy, aggSpecs) {
  if (!aggSpecs?.length) return {};
  const groups = {};
  if (groupBy?.length) {
    for (const r of rows) {
      const key = groupBy.map(k => r[k]).join("¦");
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
  } else {
    groups["__all__"] = rows;
  }

  const out = {};
  for (const [gk, arr] of Object.entries(groups)) {
    const bucket = {};
    for (const spec of aggSpecs) {
      const col = spec.column;
      const nums = arr
        .map(r => r[col])
        .filter(x => x !== null && x !== "" && !Number.isNaN(Number(x)))
        .map(Number);
      const put = (fn, value) => { bucket[`${fn}(${col})`] = value; };
      for (const fn of spec.funcs) {
        if (fn === "count") put("count", arr.length);
        else if (fn === "sum") put("sum", nums.reduce((a, b) => a + (Number(b) || 0), 0));
        else if (fn === "avg") put("avg", nums.length ? (nums.reduce((a, b) => a + (Number(b) || 0), 0) / nums.length) : 0);
        else if (fn === "min") put("min", nums.length ? Math.min(...nums) : null);
        else if (fn === "max") put("max", nums.length ? Math.max(...nums) : null);
      }
    }
    out[gk] = bucket;
  }
  return out;
}

function QueryPicker({ open, onClose, fields, value, onChange, onRun }) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  const update = (patch) => setLocal(prev => ({ ...prev, ...patch }));
  const addFilter = () => update({ filters: [...(local.filters || []), { field: fields[0], op: "contains", value: "" }] });
  const removeFilter = (i) => update({ filters: (local.filters || []).filter((_, idx) => idx !== i) });
  const addSort = () => update({ sorts: [...(local.sorts || []), { field: fields[0], dir: "asc" }] });
  const removeSort = (i) => update({ sorts: (local.sorts || []).filter((_, idx) => idx !== i) });
  const addAgg = () => update({ aggs: [...(local.aggs || []), { column: fields[0], funcs: ["count"] }] });
  const removeAgg = (i) => update({ aggs: (local.aggs || []).filter((_, idx) => idx !== i) });

  return (
    <Dropdown open={open} onClose={onClose} style={{ minWidth: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Build query</div>

      {/* Filters */}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Filter</div>
      {(local.filters || []).map((f, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <select value={f.field} onChange={e => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, filters: prev.filters.map((it, idx) => idx === i ? { ...it, field: v } : it) }));
          }}>
            {fields.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={f.op} onChange={e => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, filters: prev.filters.map((it, idx) => idx === i ? { ...it, op: v } : it) }));
          }}>
            {OPS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
          </select>
          {f.op === "between" ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input placeholder="value A" value={f.value ?? ""} onChange={e => setLocal(prev => ({ ...prev, filters: prev.filters.map((it, idx) => idx === i ? { ...it, value: e.target.value } : it) }))} />
              <input placeholder="value B" value={f.value2 ?? ""} onChange={e => setLocal(prev => ({ ...prev, filters: prev.filters.map((it, idx) => idx === i ? { ...it, value2: e.target.value } : it) }))} />
            </div>
          ) : (
            <input placeholder="value" value={f.value ?? ""} onChange={e => setLocal(prev => ({ ...prev, filters: prev.filters.map((it, idx) => idx === i ? { ...it, value: e.target.value } : it) }))} />
          )}
          <button type="button" onClick={() => removeFilter(i)} className="btn">Remove</button>
        </div>
      ))}
      <div style={{ marginBottom: 8 }}>
        <button type="button" onClick={addFilter} className="btn">Add condition</button>
      </div>

      {/* Sort */}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Sort</div>
      {(local.sorts || []).map((s, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <select value={s.field} onChange={e => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, sorts: prev.sorts.map((it, idx) => idx === i ? { ...it, field: v } : it) }));
          }}>
            {fields.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={s.dir} onChange={e => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, sorts: prev.sorts.map((it, idx) => idx === i ? { ...it, dir: v } : it) }));
          }}>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
          <button type="button" onClick={() => removeSort(i)} className="btn">Remove</button>
        </div>
      ))}
      <div style={{ marginBottom: 8 }}>
        <button type="button" onClick={addSort} className="btn">Add sort</button>
      </div>

      {/* Group + Aggregate */}
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Group & aggregate</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Group by (optional)</div>
          <select multiple value={local.groupBy || []} onChange={e => {
            const vals = Array.from(e.target.selectedOptions).map(o => o.value);
            update({ groupBy: vals });
          }} style={{ width: "100%", minHeight: 80 }}>
            {fields.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {(local.aggs || []).map((a, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <select value={a.column} onChange={e => {
            const v = e.target.value;
            setLocal(prev => ({ ...prev, aggs: prev.aggs.map((it, idx) => idx === i ? { ...it, column: v } : it) }));
          }}>
            {fields.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <select multiple value={a.funcs} onChange={e => {
            const vals = Array.from(e.target.selectedOptions).map(o => o.value);
            setLocal(prev => ({ ...prev, aggs: prev.aggs.map((it, idx) => idx === i ? { ...it, funcs: vals } : it) }));
          }} style={{ minHeight: 70 }}>
            {AGG_FUNS.map(fn => <option key={fn} value={fn}>{fn}</option>)}
          </select>
          <button type="button" onClick={() => removeAgg(i)} className="btn">Remove</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={addAgg} className="btn">Add aggregate</button>
        <button type="button" onClick={() => update({ aggs: [], groupBy: [] })} className="btn">Clear agg</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button type="button" onClick={() => { onChange(local); }} className="btn">Apply (don’t run)</button>
        <button type="button" onClick={() => { onChange(local); onRun(); }} className="btn primary">Run query</button>
      </div>
    </Dropdown>
  );
}

export default function MultiView() {
  // view state
  // view: { table, label, colsAll:[], colsShown:Set, full:[], rows:[], loading, error,
  //         columnsOpen, queryOpen, query:{filters,sorts,groupBy,aggs}, aggResult:{} }
  const [views, setViews] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [qtext, setQtext] = useState("");

  function toggleTable(val) {
    setSelectedTables(prev => (prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]));
  }

  // Load data when selection or global search text changes
  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const ensured = selectedTables.map(t => {
        const meta = TABLES[t];
        const ex = views.find(v => v.table === t);
        return ex ? { ...ex, label: meta?.label || ex.label || t } : {
          table: t, label: meta?.label || t,
          colsAll: [], colsShown: new Set(),
          full: [], rows: [], loading: false, error: null,
          columnsOpen: false, queryOpen: false,
          query: { filters: [], sorts: [], groupBy: [], aggs: [] },
          aggResult: {}
        };
      });
      setViews(ensured);

      const q = qtext.trim().toLowerCase();

      await Promise.all(ensured.map(async (v) => {
        const meta = TABLES[v.table];
        if (!meta) return;
        setViews(prev => prev.map(x => x.table === v.table ? { ...x, loading: true, error: null } : x));
        try {
          const [cols, data] = await Promise.all([
            v.colsAll.length ? Promise.resolve(v.colsAll) : fetchColumns(v.table),
            get(meta.path, { limit: 200, offset: 0 })
          ]);
          const items = (data.items || data || []).map(r => ({ ...r }));
          const filtered = q ? items.filter(row =>
            Object.values(row || {}).some(val => String(val ?? "").toLowerCase().includes(q))
          ) : items;

          const shownKeys = v.colsShown.size ? Array.from(v.colsShown) : (filtered[0] ? Object.keys(filtered[0]) : []);
          const projected = shownKeys.length
            ? filtered.map(r => { const out = {}; for (const k of shownKeys) out[k] = r[k]; return out; })
            : filtered;

          if (cancelled) return;
          setViews(prev => prev.map(x => x.table === v.table ? {
            ...x, colsAll: cols, full: items, rows: projected, loading: false, aggResult: {}
          } : x));
        } catch (e) {
          if (cancelled) return;
          setViews(prev => prev.map(x => x.table === v.table ? { ...x, loading: false, error: String(e?.message || e) } : x));
        }
      }));
    }
    if (selectedTables.length) sync(); else setViews([]);
    return () => { cancelled = true; };
  }, [selectedTables, qtext]);

  // Columns toggle re-projects rows
  function toggleCol(table, col) {
    setViews(prev => prev.map(v => {
      if (v.table !== table) return v;
      const nextShown = new Set(v.colsShown);
      if (nextShown.has(col)) nextShown.delete(col); else nextShown.add(col);
      const keys = nextShown.size ? Array.from(nextShown) : (v.full[0] ? Object.keys(v.full[0]) : []);
      const rows = keys.length ? v.full.map(r => { const o = {}; for (const k of keys) o[k] = r[k]; return o; }) : v.full;
      return { ...v, colsShown: nextShown, rows, aggResult: {} };
    }));
  }

  // Run the in-memory query (filter/sort/group/aggregate) for one view
  function runQuery(table) {
    setViews(prev => prev.map(v => {
      if (v.table !== table) return v;

      const shownKeys = v.colsShown.size ? Array.from(v.colsShown) : (v.full[0] ? Object.keys(v.full[0]) : []);
      const base = shownKeys.length ? v.full.map(r => { const o = {}; for (const k of shownKeys) o[k] = r[k]; return o; }) : v.full;

      // filters + sort
      const filtered = applyFilters(base, v.query.filters);
      const sorted = applySort(filtered, v.query.sorts);

      // group+aggregate (optional)
      const aggResult = runAgg(sorted, v.query.groupBy, v.query.aggs);

      // rows table shows the filtered+sorted rows (not the aggregated rows)
      return { ...v, rows: sorted, aggResult };
    }));
  }

  // UI helpers
  function viewColumns(v) {
    const keys = v.rows[0] ? Object.keys(v.rows[0]) : (v.colsAll.length ? v.colsAll : []);
    return keys.map(k => ({ key: k, header: k }));
  }
  function visibleKeys(v) { return v.rows[0] ? Object.keys(v.rows[0]) : []; }

  // Tables selector on the right
  function TablesDropdown() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      function onDoc(e) { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen(v => !v)} className="btn">Add tables</button>
        <Dropdown open={open} onClose={() => setOpen(false)}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Select tables</div>
          {Object.keys(TABLES).map(t => (
            <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}>
              <input type="checkbox" checked={selectedTables.includes(t)} onChange={() => toggleTable(t)} />
              <span>{TABLES[t].label || t}</span>
            </label>
          ))}
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <button type="button" onClick={() => setOpen(false)} className="btn">Done</button>
          </div>
        </Dropdown>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Toolbar */}
      <div className="card" style={{ padding: 10 }}>
        <div className="sectionHeader" style={{ borderBottom: "none", padding: 0, marginBottom: 8 }}>
          <h2>Multi View</h2>
          <small>Temporary virtual views (no DB changes)</small>
        </div>
        <div className="controlRow" style={{ flexWrap: "wrap" }}>
          <input
            placeholder="Type value to search (ID, name, amount, etc.)"
            value={qtext}
            onChange={e => setQtext(e.target.value)}
            style={{ flex: "1 1 360px", minWidth: 280 }}
          />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <TablesDropdown />
          </div>
        </div>
      </div>

      {/* Views */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
        {views.map(v => (
          <div key={v.table} className="card" style={{ flex: "1 1 620px", minWidth: 620 }}>
            <div className="sectionHeader" style={{ borderBottom: "none", padding: 0, marginBottom: 8 }}>
              <h2>{v.label}</h2>
              {v.loading && <small>Loading...</small>}
              {v.error && <small style={{ color: "red" }}>{v.error}</small>}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setViews(prev => prev.map(x => x.table === v.table ? { ...x, columnsOpen: !x.columnsOpen } : x))}
                    className="btn"
                  >
                    Columns
                  </button>
                  <ColumnsPicker
                    colsAll={v.colsAll}
                    colsShown={v.colsShown}
                    onToggle={(col) => toggleCol(v.table, col)}
                    open={v.columnsOpen}
                    onClose={() => setViews(prev => prev.map(x => x.table === v.table ? { ...x, columnsOpen: false } : x))}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setViews(prev => prev.map(x => x.table === v.table ? { ...x, queryOpen: !x.queryOpen } : x))}
                    className="btn"
                  >
                    Query
                  </button>
                  <QueryPicker
                    open={v.queryOpen}
                    onClose={() => setViews(prev => prev.map(x => x.table === v.table ? { ...x, queryOpen: false } : x))}
                    fields={visibleKeys(v).length ? visibleKeys(v) : (v.colsAll.length ? v.colsAll : [])}
                    value={v.query}
                    onChange={(nv) => setViews(prev => prev.map(x => x.table === v.table ? { ...x, query: nv } : x))}
                    onRun={() => runQuery(v.table)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTables(prev => prev.filter(t => t !== v.table))}
                  className="btn danger"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Aggregates output table (if query included aggs) */}
            {Object.keys(v.aggResult || {}).length > 0 && (
              <div className="card" style={{ padding: 8, margin: "8px 0" }}>
                <div className="cardHeader" style={{ marginBottom: 6 }}>
                  <span className="cardTitle">Aggregate result</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  {(() => {
                    const groups = Object.entries(v.aggResult);
                    const cols = groups.length ? Object.keys(groups[0][1]) : [];
                    return (
                      <table style={{ borderCollapse: "collapse", width: "100%" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" }}>Group</th>
                            {cols.map(c => <th key={c} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "6px 8px" }}>{c}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map(([gk, obj], i) => (
                            <tr key={i}>
                              <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0" }}>{gk === "__all__" ? "(all rows)" : gk}</td>
                              {cols.map(c => <td key={c} style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0" }}>{obj[c]}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            <Table
              columns={viewColumns(v)}
              rows={v.rows}
              loading={v.loading}
              error={v.error}
              emptyMessage="No matches"
            />
          </div>
        ))}
        {!views.length && (
          <div style={{ color: "#666" }}>Select tables, then use Query to filter/sort/aggregate your view.</div>
        )}
      </div>
    </div>
  );
}
