import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

export default function States() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ StateName: "", ISOCode: "", ActiveFrom: "", ActiveTo: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["StateName","ISOCode","ActiveFrom","ActiveTo"]);
  function normalizeDate(d) { return d ? String(d).slice(0, 10) : ""; }

  async function loadCols() {
    const res = await get("/ddl/States/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/states", { limit: paging.limit, offset: paging.offset });
      setRows(res.items || []);
      setPaging({ total: res.total || 0, limit: res.limit || 10, offset: res.offset || 0 });
      await loadCols();
    } catch (e) { setError(e); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [paging.limit, paging.offset]);

  async function onCreate() {
    setBusy(true);
    try {
      await post("/states", {
        ...form,
        ActiveFrom: form.ActiveFrom || null,
        ActiveTo: form.ActiveTo || null
      });
      setForm({ StateName: "", ISOCode: "", ActiveFrom: "", ActiveTo: "" });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.StateID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      StateName: row.StateName || "",
      ISOCode: row.ISOCode || "",
      ActiveFrom: normalizeDate(row.ActiveFrom),
      ActiveTo: normalizeDate(row.ActiveTo),
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    setBusy(true);
    try {
      await put(`/states/${editId}`, {
        ...form,
        ActiveFrom: form.ActiveFrom || null,
        ActiveTo: form.ActiveTo || null
      });
      setEditId(null);
      setForm({ StateName: "", ISOCode: "", ActiveFrom: "", ActiveTo: "" });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ StateName: "", ISOCode: "", ActiveFrom: "", ActiveTo: "" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this state?")) return;
    try { await del(`/states/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "StateID", header: "ID" },
    { key: "StateName", header: "Name" },
    { key: "ISOCode", header: "ISO" },
    { key: "ActiveFrom", header: "Active From" },
    { key: "ActiveTo", header: "Active To" }
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
            <button onClick={() => onDelete(r.StateID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>States</h2>
        <small>Manage states and active periods</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="State Name" value={form.StateName} onChange={e=>setForm({...form, StateName: e.target.value})} required />
          <input placeholder="ISO Code" value={form.ISOCode} onChange={e=>setForm({...form, ISOCode: e.target.value})} required />
          <input type="date" placeholder="Active From" value={form.ActiveFrom} onChange={e=>setForm({...form, ActiveFrom: e.target.value})} required />
          <input type="date" placeholder="Active To" value={form.ActiveTo} onChange={e=>setForm({...form, ActiveTo: e.target.value})} />
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
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No states" />
      </div>

      <AlterPanel
        open={alterOpen}
        onClose={() => setAlterOpen(false)}
        onApplied={async ()=>{ await loadCols(); load(); }}
        table="States"
      />
    </div>
  );
}
