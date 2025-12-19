import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

export default function Departments() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ StateID: "", DeptCode: "", DeptName: "", ParentDepartmentID: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["StateID","DeptCode","DeptName","ParentDepartmentID"]);

  async function loadCols() {
    const res = await get("/ddl/Departments/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/departments", { limit: paging.limit, offset: paging.offset });
      setRows(res.items || []);
      setPaging({ total: res.total || 0, limit: res.limit || 10, offset: res.offset || 0 });
      await loadCols();
    } catch (e) { setError(e); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [paging.limit, paging.offset]);

  async function onCreate() {
    setBusy(true);
    try {
      const body = {
        StateID: Number(form.StateID) || null,
        DeptCode: form.DeptCode,
        DeptName: form.DeptName,
        ParentDepartmentID: form.ParentDepartmentID ? Number(form.ParentDepartmentID) : null
      };
      await post("/departments", body);
      setForm({ StateID: "", DeptCode: "", DeptName: "", ParentDepartmentID: "" });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.DepartmentID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      StateID: row.StateID != null ? String(row.StateID) : "",
      DeptCode: row.DeptCode || "",
      DeptName: row.DeptName || "",
      ParentDepartmentID: row.ParentDepartmentID != null ? String(row.ParentDepartmentID) : "",
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    setBusy(true);
    try {
      const typed = {
        StateID: Number(form.StateID),
        ParentDepartmentID: form.ParentDepartmentID ? Number(form.ParentDepartmentID) : null
      };
      await put(`/departments/${editId}`, { ...form, ...typed });
      setEditId(null);
      setForm({ StateID: "", DeptCode: "", DeptName: "", ParentDepartmentID: "" });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ StateID: "", DeptCode: "", DeptName: "", ParentDepartmentID: "" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this department?")) return;
    try { await del(`/departments/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "DepartmentID", header: "ID" },
    { key: "DeptCode", header: "Code" },
    { key: "DeptName", header: "Name" },
    { key: "StateID", header: "StateID" },
    { key: "ParentDepartmentID", header: "Parent" }
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
            <button onClick={() => onDelete(r.DepartmentID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>Departments</h2>
        <small>Create and organize departments</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="StateID" value={form.StateID} onChange={e=>setForm({...form, StateID: e.target.value})} required />
          <input placeholder="Dept Code" value={form.DeptCode} onChange={e=>setForm({...form, DeptCode: e.target.value})} required />
          <input placeholder="Dept Name" value={form.DeptName} onChange={e=>setForm({...form, DeptName: e.target.value})} required />
          <input placeholder="Parent DepartmentID" value={form.ParentDepartmentID} onChange={e=>setForm({...form, ParentDepartmentID: e.target.value})} />
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
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No departments" />
      </div>

      <AlterPanel open={alterOpen} onClose={() => setAlterOpen(false)} onApplied={async ()=>{ await loadCols(); load(); }} table="Departments" />
    </div>
  );
}
