import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "Budgets";
const PK = "BudgetID";

export async function listBudgets({ limit, offset, departmentId, fiscalYearId, accountId }) {
  const where = [];
  const params = [];
  if (departmentId) { where.push("DepartmentID=?"); params.push(departmentId); }
  if (fiscalYearId) { where.push("FiscalYearID=?"); params.push(fiscalYearId); }
  if (accountId) { where.push("AccountID=?"); params.push(accountId); }
  const ws = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const items = await query(`SELECT * FROM ${TABLE} ${ws} ORDER BY ${PK} ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE} ${ws}`, params);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getBudget(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createBudget(body) {
  const coerce = {
    DepartmentID: Number, FiscalYearID: Number, AccountID: Number,
    ApprovedAmount: (v) => v == null || v === "" ? null : Number(v),
    RevisedAmount:  (v) => v == null || v === "" ? null : Number(v)
  };
  if (body.Notes === "") body.Notes = null;
  const id = await dynamicInsert(TABLE, body, { skip: [PK], coerce });
  return await getBudget(id);
}

export async function updateBudget(id, body) {
  const coerce = {
    DepartmentID: Number, FiscalYearID: Number, AccountID: Number,
    ApprovedAmount: (v) => v == null || v === "" ? null : Number(v),
    RevisedAmount:  (v) => v == null || v === "" ? null : Number(v)
  };
  if (body.Notes === "") body.Notes = null;
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK], coerce });
  return await getBudget(id);
}

export async function deleteBudget(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
