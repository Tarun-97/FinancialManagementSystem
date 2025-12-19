import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "Expenditures";
const PK = "ExpenditureID";

export async function listExpenditures({ limit, offset, departmentId, fiscalYearId, accountId, startDate, endDate }) {
  const where = [];
  const params = [];
  if (departmentId) { where.push("DepartmentID=?"); params.push(departmentId); }
  if (fiscalYearId) { where.push("FiscalYearID=?"); params.push(fiscalYearId); }
  if (accountId) { where.push("AccountID=?"); params.push(accountId); }
  if (startDate) { where.push("ExpenditureDate>=?"); params.push(startDate); }
  if (endDate) { where.push("ExpenditureDate<=?"); params.push(endDate); }
  const ws = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const items = await query(
    `SELECT * FROM ${TABLE} ${ws} ORDER BY ExpenditureDate DESC, ${PK} DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE} ${ws}`, params);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getExpenditure(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createExpenditure(body) {
  const coerce = {
    DepartmentID: Number, FiscalYearID: Number, AccountID: Number,
    Amount: (v) => v == null || v === "" ? null : Number(v)
  };
  if (body.PaymentRef === "") body.PaymentRef = null;
  const id = await dynamicInsert(TABLE, body, { skip: [PK], coerce });
  return await getExpenditure(id);
}

export async function updateExpenditure(id, body) {
  const coerce = {
    DepartmentID: Number, FiscalYearID: Number, AccountID: Number,
    Amount: (v) => v == null || v === "" ? null : Number(v)
  };
  if (body.PaymentRef === "") body.PaymentRef = null;
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK], coerce });
  return await getExpenditure(id);
}

export async function deleteExpenditure(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
