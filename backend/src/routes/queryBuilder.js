/* backend/src/routes/queryBuilder.js */
import { Router } from "express";
import {
  listBaseTables,
  listColumnsFor,
  previewSelect,
  createViewFromBuilder
} from "../services/queryBuilder.js";

const r = Router();

// GET /api/v1/dbuilder/tables
r.get("/tables", async (req, res, next) => {
  try {
    const rows = await listBaseTables();
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// POST /api/v1/dbuilder/columns  { tables: string[] }
r.post("/columns", async (req, res, next) => {
  try {
    const { tables = [] } = req.body || {};
    const rows = await listColumnsFor(tables);
    res.json({ items: rows });
  } catch (e) { next(e); }
});

// POST /api/v1/dbuilder/preview  payload = { baseTable, selects, joins, filters, orderBy, limit, offset }
r.post("/preview", async (req, res, next) => {
  try {
    const payload = req.body || {};
    const out = await previewSelect(payload);
    res.json(out);
  } catch (e) { next(e); }
});

// POST /api/v1/dbuilder/create-view  { viewName, builderPayload }
r.post("/create-view", async (req, res, next) => {
  try {
    const { viewName, builderPayload } = req.body || {};
    const out = await createViewFromBuilder(viewName, builderPayload);
    res.json({ ok: true, ...out });
  } catch (e) { next(e); }
});

export default r;
