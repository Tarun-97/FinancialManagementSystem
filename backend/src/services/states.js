import { query } from "../config/db.js";
import { dynamicInsert, dynamicUpdate } from "./utils/dynamicSql.js";

const TABLE = "States";
const PK = "StateID";

export async function listStates({ limit, offset }) {
  const items = await query(`SELECT * FROM ${TABLE} ORDER BY ${PK} ASC LIMIT ? OFFSET ?`, [limit, offset]);
  const totalRow = await query(`SELECT COUNT(*) as c FROM ${TABLE}`);
  return { items, total: totalRow[0].c, limit, offset };
}

export async function getState(id) {
  const rows = await query(`SELECT * FROM ${TABLE} WHERE ${PK}=?`, [id]);
  return rows[0] || null;
}

export async function createState(body) {
  const id = await dynamicInsert(TABLE, body, { skip: [PK] });
  return await getState(id);
}

export async function updateState(id, body) {
  await dynamicUpdate(TABLE, PK, id, body, { skip: [PK] });
  return await getState(id);
}

export async function deleteState(id) {
  await query(`DELETE FROM ${TABLE} WHERE ${PK}=?`, [id]);
}
