import { query } from "../config/db.js";

export async function utilization({ departmentId, fiscalYearId }) {
  // Build independent WHEREs and params for Budgets and Expenditures so ordering is predictable
  const whereB = [];
  const paramsB = [];
  if (departmentId) { whereB.push("b.DepartmentID=?"); paramsB.push(departmentId); }
  if (fiscalYearId) { whereB.push("b.FiscalYearID=?"); paramsB.push(fiscalYearId); }
  const wb = whereB.length ? `WHERE ${whereB.join(" AND ")}` : "";

  const whereE = [];
  const paramsE = [];
  if (departmentId) { whereE.push("e.DepartmentID=?"); paramsE.push(departmentId); }
  if (fiscalYearId) { whereE.push("e.FiscalYearID=?"); paramsE.push(fiscalYearId); }
  const we = whereE.length ? `WHERE ${whereE.join(" AND ")}` : "";

  const [bud] = await query(
    `SELECT COALESCE(SUM(b.ApprovedAmount),0) AS approved,
            COALESCE(SUM(b.RevisedAmount),0)  AS revised
     FROM Budgets b ${wb}`,
    paramsB
  );
  const [exp] = await query(
    `SELECT COALESCE(SUM(e.Amount),0) AS spent
     FROM Expenditures e ${we}`,
    paramsE
  );

  const approved = Number(bud?.approved || 0);
  const revised  = Number(bud?.revised  || 0);
  const spent    = Number(exp?.spent    || 0);
  const base = revised > 0 ? revised : approved;
  const remaining = base - spent;

  return { approved, revised, spent, remaining };
}

export async function monthlyExpenditure({ departmentId, fiscalYearId }) {
  const where = [];
  const params = [];
  if (departmentId) { where.push("DepartmentID=?"); params.push(departmentId); }
  if (fiscalYearId) { where.push("FiscalYearID=?"); params.push(fiscalYearId); }
  const ws = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT MONTH(ExpenditureDate) AS month,
            COALESCE(SUM(Amount),0) AS total
     FROM Expenditures
     ${ws}
     GROUP BY MONTH(ExpenditureDate)
     ORDER BY month ASC`,
    params
  );

  const map = new Map(rows.map(r => [Number(r.month), Number(r.total)]));
  const out = [];
  for (let m = 1; m <= 12; m++) out.push({ month: m, total: map.get(m) || 0 });
  return out;
}

export async function byAccountType({ departmentId, fiscalYearId }) {
  const where = [];
  const params = [];
  if (departmentId) { where.push("e.DepartmentID=?"); params.push(departmentId); }
  if (fiscalYearId) { where.push("e.FiscalYearID=?"); params.push(fiscalYearId); }
  const ws = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query(
    `SELECT a.AccountType AS accountType,
            COALESCE(SUM(e.Amount),0) AS total
     FROM Expenditures e
     JOIN ChartOfAccounts a ON a.AccountID = e.AccountID
     ${ws}
     GROUP BY a.AccountType
     ORDER BY total DESC`,
    params
  );

  return rows.map(r => ({ accountType: r.accountType, total: Number(r.total || 0) }));
}

export async function topDepartments({ fiscalYearId, limit = 5, departmentId = null }) {
  // Allow optional department filter to be consistent and predictable with params ordering
  const where = ["e.FiscalYearID=?"];
  const params = [fiscalYearId];
  if (departmentId) { where.push("e.DepartmentID=?"); params.push(departmentId); }
  const ws = `WHERE ${where.join(" AND ")}`;

  const rows = await query(
    `SELECT d.DepartmentID AS departmentId,
            d.DeptName      AS deptName,
            COALESCE(SUM(e.Amount),0) AS total
     FROM Expenditures e
     JOIN Departments d ON d.DepartmentID = e.DepartmentID
     ${ws}
     GROUP BY d.DepartmentID, d.DeptName
     ORDER BY total DESC
     LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows.map(r => ({
    departmentId: r.departmentId,
    deptName: r.deptName,
    total: Number(r.total || 0)
  }));
}
