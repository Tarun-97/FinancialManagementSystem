import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

export default function Budgets() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ DepartmentID: "", FiscalYearID: "", AccountID: "", FundCode: "", ApprovedAmount: "", RevisedAmount: "", Notes: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["DepartmentID","FiscalYearID","AccountID","FundCode","ApprovedAmount","RevisedAmount","Notes"]);

  async function loadCols() {
    const res = await get("/ddl/Budgets/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/budgets", { limit: paging.limit, offset: paging.offset });
      setRows(res.items || []);
      setPaging({ total: res.total || 0, limit: res.limit || 10, offset: res.offset || 0 });
      await loadCols();
    } catch (e) { setError(e); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [paging.limit, paging.offset]);

  async function onCreate() {
    setBusy(true);
    try {
      const typed = {
        DepartmentID: Number(form.DepartmentID),
        FiscalYearID: Number(form.FiscalYearID),
        AccountID: Number(form.AccountID),
        ApprovedAmount: Number(form.ApprovedAmount),
        RevisedAmount: Number(form.RevisedAmount)
      };
      await post("/budgets", { ...form, ...typed, Notes: form.Notes || null });
      setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", FundCode: "", ApprovedAmount: "", RevisedAmount: "", Notes: "" });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.BudgetID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      DepartmentID: row.DepartmentID != null ? String(row.DepartmentID) : "",
      FiscalYearID: row.FiscalYearID != null ? String(row.FiscalYearID) : "",
      AccountID: row.AccountID != null ? String(row.AccountID) : "",
      FundCode: row.FundCode || "",
      ApprovedAmount: row.ApprovedAmount != null ? String(row.ApprovedAmount) : "",
      RevisedAmount: row.RevisedAmount != null ? String(row.RevisedAmount) : "",
      Notes: row.Notes || "",
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    setBusy(true);
    try {
      const typed = {
        DepartmentID: Number(form.DepartmentID),
        FiscalYearID: Number(form.FiscalYearID),
        AccountID: Number(form.AccountID),
        ApprovedAmount: Number(form.ApprovedAmount),
        RevisedAmount: Number(form.RevisedAmount)
      };
      await put(`/budgets/${editId}`, { ...form, ...typed, Notes: form.Notes || null });
      setEditId(null);
      setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", FundCode: "", ApprovedAmount: "", RevisedAmount: "", Notes: "" });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", FundCode: "", ApprovedAmount: "", RevisedAmount: "", Notes: "" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this budget?")) return;
    try { await del(`/budgets/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "BudgetID", header: "ID" },
    { key: "DepartmentID", header: "Department" },
    { key: "FiscalYearID", header: "FY" },
    { key: "AccountID", header: "Account" },
    { key: "FundCode", header: "Fund" },
    { key: "ApprovedAmount", header: "Approved" },
    { key: "RevisedAmount", header: "Revised" },
    { key: "Notes", header: "Notes" },
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
            <button onClick={() => onDelete(r.BudgetID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>Budgets</h2>
        <small>Approved and revised allocations</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="DepartmentID" value={form.DepartmentID} onChange={e=>setForm({...form, DepartmentID: e.target.value})} required />
          <input placeholder="FiscalYearID" value={form.FiscalYearID} onChange={e=>setForm({...form, FiscalYearID: e.target.value})} required />
          <input placeholder="AccountID" value={form.AccountID} onChange={e=>setForm({...form, AccountID: e.target.value})} required />
          <input placeholder="Fund Code" value={form.FundCode} onChange={e=>setForm({...form, FundCode: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Approved Amount" value={form.ApprovedAmount} onChange={e=>setForm({...form, ApprovedAmount: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Revised Amount" value={form.RevisedAmount} onChange={e=>setForm({...form, RevisedAmount: e.target.value})} required />
          <input placeholder="Notes" value={form.Notes} onChange={e=>setForm({...form, Notes: e.target.value})} />
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
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No budgets" />
      </div>

      <AlterPanel open={alterOpen} onClose={() => setAlterOpen(false)} onApplied={async ()=>{ await loadCols(); load(); }} table="Budgets" />
    </div>
  );
}
