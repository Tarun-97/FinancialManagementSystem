import React, { useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "../lib/api.js";
import Table from "../components/Table.jsx";
import Form from "../components/Form.jsx";
import AlterPanel from "../components/AlterPanel.jsx";
import DynamicFields from "../components/DynamicFields.jsx";

const ACCOUNT_TYPES = ["Revenue","Expense","Asset","Liability","Equity"];

export default function Accounts() {
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ AccountCode: "", AccountName: "", AccountType: "Expense", EconomicClass: "", FunctionalClass: "", FundCode: "" });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [alterOpen, setAlterOpen] = useState(false);
  const [columns, setColumns] = useState([]);

  const known = new Set(["AccountCode","AccountName","AccountType","EconomicClass","FunctionalClass","FundCode"]);

  async function loadCols() {
    const res = await get("/ddl/ChartOfAccounts/columns");
    setColumns(res.columns || []);
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await get("/accounts", { limit: paging.limit, offset: paging.offset });
      setRows(res.items || []);
      setPaging({ total: res.total || 0, limit: res.limit || 10, offset: res.offset || 0 });
      await loadCols();
    } catch (e) { setError(e); setRows([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [paging.limit, paging.offset]);

  async function onCreate() {
    if (!ACCOUNT_TYPES.includes(form.AccountType)) { alert("Invalid AccountType"); return; }
    setBusy(true);
    try {
      await post("/accounts", form);
      setForm({ AccountCode: "", AccountName: "", AccountType: "Expense", EconomicClass: "", FunctionalClass: "", FundCode: "" });
      await load();
    } catch (e) { alert("Create failed: " + e.message); } finally { setBusy(false); }
  }

  function onStartEdit(row) {
    setEditId(row.AccountID);
    const dynamic = {};
    (columns || []).forEach(c => { const k = c.Field; if (!known.has(k)) dynamic[k] = row[k] ?? ""; });
    setForm({
      AccountCode: row.AccountCode || "",
      AccountName: row.AccountName || "",
      AccountType: row.AccountType || "Expense",
      EconomicClass: row.EconomicClass || "",
      FunctionalClass: row.FunctionalClass || "",
      FundCode: row.FundCode || "",
      ...dynamic
    });
  }

  async function onUpdate() {
    if (!editId) return;
    if (!ACCOUNT_TYPES.includes(form.AccountType)) { alert("Invalid AccountType"); return; }
    setBusy(true);
    try {
      await put(`/accounts/${editId}`, form);
      setEditId(null);
      setForm({ AccountCode: "", AccountName: "", AccountType: "Expense", EconomicClass: "", FunctionalClass: "", FundCode: "" });
      await load();
    } catch (e) { alert("Update failed: " + e.message); } finally { setBusy(false); }
  }

  function onCancelEdit() {
    setEditId(null);
    setForm({ AccountCode: "", AccountName: "", AccountType: "Expense", EconomicClass: "", FunctionalClass: "", FundCode: "" });
  }

  async function onDelete(id) {
    if (!confirm("Delete this account?")) return;
    try { await del(`/accounts/${id}`); await load(); }
    catch (e) { alert("Delete failed: " + e.message); }
  }

  const baseCols = [
    { key: "AccountID", header: "ID" },
    { key: "AccountCode", header: "Code" },
    { key: "AccountName", header: "Name" },
    { key: "AccountType", header: "Type" },
    { key: "EconomicClass", header: "Economic" },
    { key: "FunctionalClass", header: "Functional" },
    { key: "FundCode", header: "Fund" }
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
            <button onClick={() => onDelete(r.AccountID)} className="btn danger">Delete</button>
          </>
        )
      }
    ];
  }, [dynamicKeys]);

  const isEditing = editId !== null;

  return (
    <div className="container">
      <div className="sectionHeader">
        <h2>Accounts</h2>
        <small>Chart of Accounts</small>
      </div>

      <Form onSubmit={isEditing ? onUpdate : onCreate} busy={busy}>
        <div className="grid filters">
          <input placeholder="Code" value={form.AccountCode} onChange={e=>setForm({...form, AccountCode: e.target.value})} required />
          <input placeholder="Name" value={form.AccountName} onChange={e=>setForm({...form, AccountName: e.target.value})} required />
          <select value={form.AccountType} onChange={e=>setForm({...form, AccountType: e.target.value})}>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Economic Class" value={form.EconomicClass} onChange={e=>setForm({...form, EconomicClass: e.target.value})} />
          <input placeholder="Functional Class" value={form.FunctionalClass} onChange={e=>setForm({...form, FunctionalClass: e.target.value})} />
          <input placeholder="Fund Code" value={form.FundCode} onChange={e=>setForm({...form, FundCode: e.target.value})} />
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
        <Table columns={columnsView} rows={rows} loading={loading} error={error} emptyMessage="No accounts" />
      </div>

      <AlterPanel open={alterOpen} onClose={() => setAlterOpen(false)} onApplied={async ()=>{ await loadCols(); load(); }} table="ChartOfAccounts" />
    </div>
  );
}
