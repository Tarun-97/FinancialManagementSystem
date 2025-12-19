import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
// import { fiscalYearBody } from "../validators/fiscalYears.js";
import {
  listFiscalYears,
  getFiscalYear,
  createFiscalYear,
  updateFiscalYear,
  deleteFiscalYear
} from "../services/fiscalYears.js";

const r = Router();

r.get("/", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = await listFiscalYears({ limit, offset });
    res.json(data);
  } catch (e) { next(e); }
});

r.post("/", /* validate(fiscalYearBody), */ async (req, res, next) => {
  try {
    const created = await createFiscalYear(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await getFiscalYear(id);
    if (!row) return next({ status: 404 });
    res.json(row);
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getFiscalYear(id);
    if (!existing) return next({ status: 404 });
    const updated = await updateFiscalYear(id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getFiscalYear(id);
    if (!existing) return next({ status: 404 });
    await deleteFiscalYear(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
