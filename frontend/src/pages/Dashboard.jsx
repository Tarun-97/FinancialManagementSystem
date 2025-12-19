import React, { useEffect, useMemo, useState } from "react";
import { get } from "../lib/api.js";
import { DepartmentSelect, FiscalYearSelect } from "../components/Filters.jsx";
import ChartCard from "../components/ChartCard.jsx";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const [deptId, setDeptId] = useState(null);
  const [fyId, setFyId] = useState(2);

  const [util, setUtil] = useState(null);
  const [mexp, setMexp] = useState([]);
  const [byType, setByType] = useState([]);
  const [topDepts, setTopDepts] = useState([]);

  const [loading, setLoading] = useState({ util: false, mexp: false, byType: false, top: false });
  const [error, setError] = useState({ util: null, mexp: null, byType: null, top: null });

  async function loadUtil() {
    setLoading(s => ({ ...s, util: true })); setError(s => ({ ...s, util: null }));
    try {
      if (!deptId || !fyId) { setUtil(null); }
      else { setUtil((await get("/analytics/utilization", { departmentId: deptId, fiscalYearId: fyId })) || null); }
    } catch (e) { setError(s => ({ ...s, util: e })); setUtil(null); }
    finally { setLoading(s => ({ ...s, util: false })); }
  }

  async function loadMonthly() {
    setLoading(s => ({ ...s, mexp: true })); setError(s => ({ ...s, mexp: null }));
    try {
      if (!deptId || !fyId) { setMexp([]); }
      else {
        const res = await get("/analytics/monthly-expenditure", { departmentId: deptId, fiscalYearId: fyId });
        setMexp(Array.isArray(res) ? res : []);
      }
    } catch (e) { setError(s => ({ ...s, mexp: e })); setMexp([]); }
    finally { setLoading(s => ({ ...s, mexp: false })); }
  }

  async function loadByType() {
    setLoading(s => ({ ...s, byType: true })); setError(s => ({ ...s, byType: null }));
    try {
      if (!fyId) { setByType([]); }
      else {
        const params = deptId ? { departmentId: deptId, fiscalYearId: fyId } : { fiscalYearId: fyId };
        const res = await get("/analytics/by-account-type", params);
        setByType(Array.isArray(res) ? res : []);
      }
    } catch (e) { setError(s => ({ ...s, byType: e })); setByType([]); }
    finally { setLoading(s => ({ ...s, byType: false })); }
  }

  async function loadTopDepts() {
    setLoading(s => ({ ...s, top: true })); setError(s => ({ ...s, top: null }));
    try {
      if (!fyId) { setTopDepts([]); }
      else {
        const res = await get("/analytics/top-departments", { fiscalYearId: fyId, limit: 5 });
        setTopDepts(Array.isArray(res) ? res : []);
      }
    } catch (e) { setError(s => ({ ...s, top: e })); setTopDepts([]); }
    finally { setLoading(s => ({ ...s, top: false })); }
  }

  useEffect(() => {
    loadUtil(); loadMonthly(); loadByType(); loadTopDepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptId, fyId]);

  const utilData = util ? [
    { name: "Approved", value: Number(util.approved ?? 0) },
    { name: "Revised",  value: Number(util.revised  ?? 0) },
    { name: "Spent",    value: Number(util.spent    ?? 0) },
    { name: "Remaining",value: Number(util.remaining?? 0) }
  ] : [];

  const monthlyData = Array.isArray(mexp) ? mexp.map(x => ({
    name: String(x.month ?? ""), total: Number(x.total ?? 0)
  })) : [];

  const byTypeData = Array.isArray(byType) ? byType.map(x => ({
    name: String(x.accountType ?? ""), value: Number(x.total ?? 0)
  })) : [];

  const topData = Array.isArray(topDepts) ? topDepts.map(x => ({
    name: String(x.deptName ?? x.departmentId ?? ""), total: Number(x.total ?? 0)
  })) : [];

  return (
    <div className="container">
      <div className="hero">
        
        <div className="overlay">
          <h1>State Finance Analytics</h1>
          <p>Explore allocations and spending across departments</p>
        </div>
      </div>

      <div className="filterBox">
        <div className="grid filters">
          <div>
            <div className="label"></div>
            <DepartmentSelect value={deptId} onChange={setDeptId} />
          </div>
          <div>
            <div className="label"></div>
            <FiscalYearSelect value={fyId} onChange={setFyId} />
          </div>
        </div>
        <div className="controlRow" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => setDeptId(null)}>Clear dept</button>
        </div>
      </div>

      <div className="grid auto">
        <ChartCard
          title={
            <div className="cardHeader">
              <span className="badge purple">B</span>
              <span className="cardTitle">Budget vs Expenditure</span>
              <span className="cardSubtle">
                {loading.util ? "Loading…" : (!util ? "No data" : "")}
              </span>
            </div>
          }
          className="card"
          loading={loading.util}
          error={error.util}
          empty={!util}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="cardHeader">
              <span className="badge green">T</span>
              <span className="cardTitle">Monthly Expenditure</span>
              <span className="cardSubtle">
                {loading.mexp ? "Loading…" : (!monthlyData.length ? "No data" : "")}
              </span>
            </div>
          }
          className="card"
          loading={loading.mexp}
          error={error.mexp}
          empty={!monthlyData.length}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="cardHeader">
              <span className="badge cyan">A</span>
              <span className="cardTitle">By Account Type</span>
              <span className="cardSubtle">
                {loading.byType ? "Loading…" : (!byTypeData.length ? "No data" : "")}
              </span>
            </div>
          }
          className="card"
          loading={loading.byType}
          error={error.byType}
          empty={!byTypeData.length}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byTypeData} dataKey="value" nameKey="name" outerRadius={100} label>
                {byTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={
            <div className="cardHeader">
              <span className="badge amber">D</span>
              <span className="cardTitle">Top Departments</span>
              <span className="cardSubtle">
                {loading.top ? "Loading…" : (!topData.length ? "No data" : "")}
              </span>
            </div>
          }
          className="card"
          loading={loading.top}
          error={error.top}
          empty={!topData.length}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={topData} margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill={COLORS[1]} radius={[6, 6, 6, 6]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
