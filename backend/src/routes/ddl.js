import { Router } from "express";
import { query } from "../config/db.js";

const r = Router();

function qIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    const err = new Error("Invalid identifier");
    err.status = 400;
    throw err;
  }
  return "`" + name + "`";
}

const VALID_TYPES = new Set([
  "VARCHAR(50)","VARCHAR(100)","VARCHAR(200)","TEXT",
  "INT","BIGINT","DECIMAL(18,2)","DATE","DATETIME","TIMESTAMP","BOOLEAN"
]);

r.get("/:table/columns", async (req, res, next) => {
  try {
    const t = qIdent(req.params.table);
    const rows = await query(`SHOW COLUMNS FROM ${t}`);
    res.json({ table: req.params.table, columns: rows });
  } catch (e) { next(e); }
});

r.post("/:table/alter", async (req, res, next) => {
  try {
    const table = req.params.table;
    const t = qIdent(table);
    const { action, payload = {} } = req.body || {};
    if (!action) {
      const err = new Error("Missing action");
      err.status = 400;
      throw err;
    }

    let sql = null;

    if (action === "renameTable") {
      const { newTableName } = payload;
      if (!newTableName) {
        const err = new Error("newTableName required");
        err.status = 400;
        throw err;
      }
      sql = `RENAME TABLE ${t} TO ${qIdent(newTableName)};`;
    } else if (action === "addColumn") {
      const { columnName, dataType, nullable = true, defaultValue = null } = payload;
      if (!columnName || !dataType) {
        const err = new Error("columnName and dataType required");
        err.status = 400;
        throw err;
      }
      if (!VALID_TYPES.has(dataType)) {
        const err = new Error("Unsupported dataType");
        err.status = 400;
        throw err;
      }
      const parts = [`ALTER TABLE ${t} ADD COLUMN ${qIdent(columnName)} ${dataType}`];
      parts.push(nullable ? "NULL" : "NOT NULL");
      if (defaultValue !== null && defaultValue !== "") {
        if (/^(INT|BIGINT|DECIMAL|BOOLEAN)/.test(dataType)) {
          parts.push(`DEFAULT ${defaultValue}`);
        } else {
          parts.push(`DEFAULT '${String(defaultValue).replace(/'/g, "''")}'`);
        }
      }
      sql = parts.join(" ") + ";";
    } else if (action === "modifyColumn") {
      const { columnName, dataType, nullable = true, defaultValue = null } = payload;
      if (!columnName || !dataType) {
        const err = new Error("columnName and dataType required");
        err.status = 400;
        throw err;
      }
      const parts = [`ALTER TABLE ${t} MODIFY COLUMN ${qIdent(columnName)} ${dataType}`];
      parts.push(nullable ? "NULL" : "NOT NULL");
      if (defaultValue !== null && defaultValue !== "") {
        if (/^(INT|BIGINT|DECIMAL|BOOLEAN)/.test(dataType)) {
          parts.push(`DEFAULT ${defaultValue}`);
        } else {
          parts.push(`DEFAULT '${String(defaultValue).replace(/'/g, "''")}'`);
        }
      }
      sql = parts.join(" ") + ";";
    } else if (action === "dropColumn") {
      const { columnName } = payload;
      if (!columnName) {
        const err = new Error("columnName required");
        err.status = 400;
        throw err;
      }
      sql = `ALTER TABLE ${t} DROP COLUMN ${qIdent(columnName)};`;
    } else {
      const err = new Error("Unsupported action");
      err.status = 400;
      throw err;
    }

    const result = await query(sql);
    res.json({ ok: true, sql, result });
  } catch (e) { next(e); }
});

export default r;
