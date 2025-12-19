/* backend/src/services/queryBuilder.js */
import { query } from "../config/db.js";

/**
 * Validation and helpers
 */
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_JOIN_TYPES = new Set(["INNER", "LEFT", "RIGHT"]);
const SAFE_OPS = new Set(["=", "<>", ">", "<", ">=", "<=", "LIKE"]);
const SAFE_DIRS = new Set(["ASC", "DESC"]);

function assertIdent(name, what = "identifier") {
  if (!IDENT_RE.test(name)) throw { status: 400, message: `Invalid ${what}: ${name}` };
}
function qIdent(name) {
  assertIdent(name, "identifier");
  return `\`${name}\``;
}
function normalizeOp(op) {
  const o = String(op || "").toUpperCase();
  if (!SAFE_OPS.has(o)) throw { status: 400, message: `Invalid operator: ${op}` };
  return o;
}
function normalizeDir(dir) {
  const d = String(dir || "ASC").toUpperCase();
  if (!SAFE_DIRS.has(d)) throw { status: 400, message: `Invalid order direction: ${dir}` };
  return d;
}
function tablesInQuery(baseTable, joins) {
  const set = new Set([baseTable]);
  (joins || []).forEach(j => { if (j?.table) set.add(j.table); });
  return set;
}

/**
 * Schema readers
 */
export async function listBaseTables() {
  try {
    return await query(`
      SELECT TABLE_NAME AS tableName
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE='BASE TABLE'
      ORDER BY TABLE_NAME
    `);
  } catch (err) {
    console.error("[dbuilder.tables] Error:", err);
    throw err;
  }
}

export async function listColumnsFor(tableNames = []) {
  try {
    if (!Array.isArray(tableNames) || tableNames.length === 0) return [];
    tableNames.forEach(t => assertIdent(t, "table name"));
    const placeholders = tableNames.map(() => "?").join(",");
    return await query(`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `, tableNames);
  } catch (err) {
    console.error("[dbuilder.columns] Error:", err);
    throw err;
  }
}

/**
 * SQL builder with strict validation
 */
export function buildSelectSQL({
  baseTable,
  selects = [],
  joins = [],
  filters = [],
  orderBy = [],
  limit,
  offset
}) {
  if (!baseTable) throw { status: 400, message: "baseTable is required" };
  assertIdent(baseTable, "base table");
  const base = qIdent(baseTable);

  const allowed = tablesInQuery(baseTable, joins);

  // SELECT
  let sel;
  if (selects.length) {
    for (const s of selects) {
      if (!s?.table || !s?.column) throw { status: 400, message: "Each select needs table and column" };
      if (!allowed.has(s.table)) throw { status: 400, message: `Selected column ${s.table}.${s.column} requires adding a JOIN to ${s.table}` };
    }
    sel = selects.map(s => {
      assertIdent(s.table, "table");
      assertIdent(s.column, "column");
      const alias = s.alias ? (assertIdent(s.alias, "alias"), ` AS ${qIdent(s.alias)}`) : "";
      return `${qIdent(s.table)}.${qIdent(s.column)}${alias}`;
    }).join(", ");
  } else {
    sel = `${base}.*`;
  }

  const from = `FROM ${base}`;

  // JOINS
  const joinSql = (joins || []).map(j => {
    const jt = SAFE_JOIN_TYPES.has(String(j?.type || "INNER").toUpperCase())
      ? String(j.type || "INNER").toUpperCase()
      : "INNER";
    if (!j?.table) throw { status: 400, message: "join requires table" };
    assertIdent(j.table, "join table");
    const onExpr = (j.on || []).map(cond => {
      if (!cond?.left?.table || !cond?.left?.column || !cond?.right?.table || !cond?.right?.column) {
        throw { status: 400, message: "join condition requires left.table, left.column, right.table, right.column" };
      }
      assertIdent(cond.left.table, "join left table");
      assertIdent(cond.left.column, "join left column");
      assertIdent(cond.right.table, "join right table");
      assertIdent(cond.right.column, "join right column");
      const op = normalizeOp(cond.op || "=");
      return `${qIdent(cond.left.table)}.${qIdent(cond.left.column)} ${op} ${qIdent(cond.right.table)}.${qIdent(cond.right.column)}`;
    }).join(" AND ");
    if (!onExpr) throw { status: 400, message: `Add at least one ON condition for JOIN to ${j.table}` };
    return `${jt} JOIN ${qIdent(j.table)} ON ${onExpr}`;
  }).join(" ");

  // WHERE
  const whereSql = (filters || []).map(f => {
    if (!f?.table || !f?.column) throw { status: 400, message: "filter requires table and column" };
    if (!allowed.has(f.table)) throw { status: 400, message: `Filter on ${f.table}.${f.column} requires a JOIN to ${f.table}` };
    assertIdent(f.table, "filter table");
    assertIdent(f.column, "filter column");
    const lhs = `${qIdent(f.table)}.${qIdent(f.column)}`;
    const op = normalizeOp(f.op || "=");
    const vt = (f.valueType || "string").toLowerCase();

    if (vt === "null") {
      return `${lhs} ${op === "<>" ? "IS NOT NULL" : "IS NULL"}`;
    }
    if (vt === "number") {
      const num = Number(f.value);
      if (!Number.isFinite(num)) throw { status: 400, message: `Invalid number filter value for ${f.table}.${f.column}` };
      return `${lhs} ${op} ${num}`;
    }
    const v = String(f.value ?? "");
    const escaped = v.replace(/'/g, "''");
    return `${lhs} ${op} '${escaped}'`;
  }).join(" AND ");
  const where = whereSql ? `WHERE ${whereSql}` : "";

  // ORDER BY
  const order = (orderBy || []).length
    ? `ORDER BY ${orderBy.map(o => {
        if (!o?.table || !o?.column) throw { status: 400, message: "orderBy requires table and column" };
        if (!allowed.has(o.table)) throw { status: 400, message: `Order on ${o.table}.${o.column} requires a JOIN to ${o.table}` };
        assertIdent(o.table, "order table");
        assertIdent(o.column, "order column");
        return `${qIdent(o.table)}.${qIdent(o.column)} ${normalizeDir(o.dir)}`;
      }).join(", ")}`
    : "";

  const lim = Number.isFinite(limit) ? `LIMIT ${Math.max(1, Number(limit))}` : "";
  const off = Number.isFinite(offset) ? `OFFSET ${Math.max(0, Number(offset))}` : "";

  const sql = `SELECT ${sel} ${from} ${joinSql} ${where} ${order} ${lim} ${off}`.replace(/\s+/g, " ").trim();
  return sql;
}

/**
 * Preview (no create)
 */
export async function previewSelect(payload) {
  const sql = buildSelectSQL(payload);
  try {
    const rows = await query(sql);
    return { sql, rows };
  } catch (err) {
    console.error("[dbuilder.preview] SQL:", sql);
    console.error("[dbuilder.preview] Error:", err);
    if (err && err.code) throw { status: 400, message: `${err.code}: ${err.sqlMessage || err.message}` };
    throw err;
  }
}

/**
 * Create or replace VIEW
 */
export async function createViewFromBuilder(viewName, payload) {
  try {
    if (!viewName) throw { status: 400, message: "viewName is required" };
    assertIdent(viewName, "view name");
    const selectSql = buildSelectSQL({ ...payload, limit: undefined, offset: undefined });
    const createSql = `CREATE OR REPLACE VIEW ${qIdent(viewName)} AS ${selectSql}`;
    await query(createSql);
    return { viewName };
  } catch (err) {
    console.error("[dbuilder.create-view] Error:", err);
    throw err;
  }
}
