import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "FiscalYears";
const PK = "FiscalYearID";

export async function listFiscalYears({ limit, offset }) {
  const items = await query(`SELECT * FROM ${TABLE} ORDER BY ${PK} ASC LIMIT ? OFFSET ?`, [limit, offset]);
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE}`);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getFiscalYear(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createFiscalYear(body) {
  if (typeof body.IsCurrent !== "undefined") body.IsCurrent = !!body.IsCurrent;
  const id = await dynamicInsert(TABLE, body, { skip: [PK] });
  return await getFiscalYear(id);
}

export async function updateFiscalYear(id, body) {
  if (typeof body.IsCurrent !== "undefined") body.IsCurrent = !!body.IsCurrent;
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK] });
  return await getFiscalYear(id);
}

export async function deleteFiscalYear(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
