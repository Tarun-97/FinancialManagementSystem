import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

export default function Expenditures() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ DepartmentID: "", FiscalYearID: "", AccountID: "", ExpenditureDate: "", Amount: "", PaymentRef: "", Description: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["DepartmentID","FiscalYearID","AccountID","ExpenditureDate","Amount","PaymentRef","Description"]);
  function normalizeDate(d) { return d ? String(d).slice(0, 10) : ""; }

  async function loadCols() {
    const res = await get("/ddl/Expenditures/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/expenditures", { limit: paging.limit, offset: paging.offset });
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
        DepartmentID: Number(form.DepartmentID),
        FiscalYearID: Number(form.FiscalYearID),
        AccountID: Number(form.AccountID),
        ExpenditureDate: form.ExpenditureDate || null,
        Amount: Number(form.Amount),
        PaymentRef: form.PaymentRef || null,
        Description: form.Description
      };
      await post("/expenditures", { ...form, ...body });
      setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", ExpenditureDate: "", Amount: "", PaymentRef: "", Description: "" });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.ExpenditureID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      DepartmentID: row.DepartmentID != null ? String(row.DepartmentID) : "",
      FiscalYearID: row.FiscalYearID != null ? String(row.FiscalYearID) : "",
      AccountID: row.AccountID != null ? String(row.AccountID) : "",
      ExpenditureDate: normalizeDate(row.ExpenditureDate),
      Amount: row.Amount != null ? String(row.Amount) : "",
      PaymentRef: row.PaymentRef || "",
      Description: row.Description || "",
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    setBusy(true);
    try {
      const body = {
        DepartmentID: Number(form.DepartmentID),
        FiscalYearID: Number(form.FiscalYearID),
        AccountID: Number(form.AccountID),
        ExpenditureDate: form.ExpenditureDate || null,
        Amount: Number(form.Amount),
        PaymentRef: form.PaymentRef || null,
        Description: form.Description
      };
      await put(`/expenditures/${editId}`, { ...form, ...body });
      setEditId(null);
      setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", ExpenditureDate: "", Amount: "", PaymentRef: "", Description: "" });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ DepartmentID: "", FiscalYearID: "", AccountID: "", ExpenditureDate: "", Amount: "", PaymentRef: "", Description: "" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this expenditure?")) return;
    try { await del(`/expenditures/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "ExpenditureID", header: "ID" },
    { key: "DepartmentID", header: "Department" },
    { key: "FiscalYearID", header: "FY" },
    { key: "AccountID", header: "Account" },
    { key: "ExpenditureDate", header: "Date" },
    { key: "Amount", header: "Amount" },
    { key: "PaymentRef", header: "PaymentRef" },
    { key: "Description", header: "Description" },
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
            <button onClick={() => onDelete(r.ExpenditureID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>Expenditures</h2>
        <small>Transactions and payments</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="DepartmentID" value={form.DepartmentID} onChange={e=>setForm({...form, DepartmentID: e.target.value})} required />
          <input placeholder="FiscalYearID" value={form.FiscalYearID} onChange={e=>setForm({...form, FiscalYearID: e.target.value})} required />
          <input placeholder="AccountID" value={form.AccountID} onChange={e=>setForm({...form, AccountID: e.target.value})} required />
          <input type="date" placeholder="Expenditure Date" value={form.ExpenditureDate} onChange={e=>setForm({...form, ExpenditureDate: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Amount" value={form.Amount} onChange={e=>setForm({...form, Amount: e.target.value})} required />
          <input placeholder="Payment Ref" value={form.PaymentRef} onChange={e=>setForm({...form, PaymentRef: e.target.value})} />
          <input placeholder="Description" value={form.Description} onChange={e=>setForm({...form, Description: e.target.value})} required />
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
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No expenditures" />
      </div>

      <AlterPanel open={alterOpen} onClose={() => setAlterOpen(false)} onApplied={async ()=>{ await loadCols(); load(); }} table="Expenditures" />
    </div>
  );
}
