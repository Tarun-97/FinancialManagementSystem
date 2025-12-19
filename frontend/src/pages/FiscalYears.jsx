import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

export default function FiscalYears() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ YearLabel: "", StartDate: "", EndDate: "", IsCurrent: false });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["YearLabel","StartDate","EndDate","IsCurrent"]);
  function normalizeDate(d) { return d ? String(d).slice(0,10) : ""; }

  async function loadCols() {
    const res = await get("/ddl/FiscalYears/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/fiscal-years", { limit: paging.limit, offset: paging.offset });
      setRows(res.items || []);
      setPaging({ total: res.total || 0, limit: res.limit || 10, offset: res.offset || 0 });
      await loadCols();
    } catch (e) { setError(e); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [paging.limit, paging.offset]);

  async function onCreate() {
    setBusy(true);
    try {
      await post("/fiscal-years", { ...form, IsCurrent: !!form.IsCurrent });
      setForm({ YearLabel: "", StartDate: "", EndDate: "", IsCurrent: false });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.FiscalYearID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      YearLabel: row.YearLabel || "",
      StartDate: normalizeDate(row.StartDate),
      EndDate: normalizeDate(row.EndDate),
      IsCurrent: !!row.IsCurrent,
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    setBusy(true);
    try {
      await put(`/fiscal-years/${editId}`, {
        ...form,
        StartDate: form.StartDate || null,
        EndDate: form.EndDate || null,
        IsCurrent: !!form.IsCurrent
      });
      setEditId(null);
      setForm({ YearLabel: "", StartDate: "", EndDate: "", IsCurrent: false });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ YearLabel: "", StartDate: "", EndDate: "", IsCurrent: false });
  }

  async function onDelete(id) {
    if (!confirm("Delete this fiscal year?")) return;
    try { await del(`/fiscal-years/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "FiscalYearID", header: "ID" },
    { key: "YearLabel", header: "Label" },
    { key: "StartDate", header: "Start" },
    { key: "EndDate", header: "End" },
    { key: "IsCurrent", header: "Current", render: (r) => (r.IsCurrent ? "Yes" : "No") },
  ];
  const dynamicKeys = useMemo(() => {
    const sample = rows?.[0] || null;
    if (!sample) return [];
    const knownKeys = new Set(baseCols.map(c => c.key).concat(["actions"]));
    return Object.keys(sample).filter(k => !knownKeys.has(k));
  }, [rows]);
  const columnsView = useMemo(() => {
    const dyn = dynamicKeys.map(k => ({ key: k, header: k }));
    return [
      ...baseCols,
      ...dyn,
      {
        key: "actions",
        header: "Actions",
        render: (r) => (
          <>
            <button onClick={() => onStartEdit(r)} className="btn">Edit</button>
            <button onClick={() => onDelete(r.FiscalYearID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>Fiscal Years</h2>
        <small>Maintain fiscal year windows</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="Label" value={form.YearLabel} onChange={e=>setForm({...form, YearLabel: e.target.value})} required />
          <input type="date" placeholder="Start" value={form.StartDate} onChange={e=>setForm({...form, StartDate: e.target.value})} required />
          <input type="date" placeholder="End" value={form.EndDate} onChange={e=>setForm({...form, EndDate: e.target.value})} required />
          <label style={{display:"inline-flex", gap:8, alignItems:"center"}}>
            <input type="checkbox" checked={form.IsCurrent} onChange={e=>setForm({...form, IsCurrent: e.target.checked})} />
            Current
          </label>
        </div>
        <DynamicFields knownKeys={known} columns={columns} values={form} onChange={setForm} />
        <div className="controlRow" style={{ marginTop: 8 }}>
          {isEditing ? (
            <>
              <button type="submit" className="btn primary">Update</button>
              <button type="button" onClick={onCancelEdit} className="btn">Cancel</button>
            </>
          ) : (
            <button type="submit" className="btn primary">Create</button>
          )}
          <button type="button" onClick={() => setAlterOpen(true)} className="btn" style={{ marginLeft: "auto" }}>Alter</button>
        </div>
      </Form>

      <div className="card" style={{ marginTop: 12 }}>
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No fiscal years" />
      </div>

      <AlterPanel open={alterOpen} onClose={() => setAlterOpen(false)} onApplied={async ()=>{ await loadCols(); load(); }} table="FiscalYears" />
    </div>
  );
}
