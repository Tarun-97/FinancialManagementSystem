import { query } from "../../config/db.js";

export async function getColumns(table) {
  const rows = await query(`SHOW COLUMNS FROM \`${table}\``);
  return rows.map(r => r.Field);
}

export async function dynamicInsert(table, body) {
  const cols = await getColumns(table);
  const allowed = new Set(cols);
  const keys = [];
  const placeholders = [];
  const params = [];
  for (const [k, v] of Object.entries(body || {})) {
    if (!allowed.has(k)) continue;
    keys.push("`" + k + "`");
    placeholders.push("?");
    params.push(v === "" ? null : v);
  }
  if (keys.length === 0) throw new Error("No valid columns to insert");
  const sql = `INSERT INTO \`${table}\` (${keys.join(",")}) VALUES (${placeholders.join(",")})`;
  const res = await query(sql, params);
  return res.insertId;
}

export async function dynamicUpdate(table, pkName, id, body) {
  const cols = await getColumns(table);
  const allowed = new Set(cols.filter(c => c !== pkName));
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(body || {})) {
    if (!allowed.has(k)) continue;
    sets.push("`" + k + "` = ?");
    params.push(v === "" ? null : v);
  }
  if (sets.length === 0) return false;
  params.push(id);
  const sql = `UPDATE \`${table}\` SET ${sets.join(", ")} WHERE \`${pkName}\` = ?`;
  await query(sql, params);
  return true;
}
