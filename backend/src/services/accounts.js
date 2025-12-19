import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "ChartOfAccounts";
const PK = "AccountID";

export async function listAccounts({ limit, offset }) {
  const items = await query(`SELECT * FROM ${TABLE} ORDER BY ${PK} ASC LIMIT ? OFFSET ?`, [limit, offset]);
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE}`);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getAccount(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createAccount(body) {
  const coerce = { noofemploye: v => (v == null || v === "" ? null : Number(v)) };
  const id = await dynamicInsert(TABLE, body, { skip: [PK], coerce });
  return await getAccount(id);
}

export async function updateAccount(id, body) {
  const coerce = { noofemploye: v => (v == null || v === "" ? null : Number(v)) };
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK], coerce });
  return await getAccount(id);
}

export async function deleteAccount(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
