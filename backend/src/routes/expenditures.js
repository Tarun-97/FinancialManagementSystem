import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
// import { expenditureBody } from "../validators/expenditures.js";
import {
  listExpenditures,
  getExpenditure,
  createExpenditure,
  updateExpenditure,
  deleteExpenditure
} from "../services/expenditures.js";

const r = Router();

r.get("/", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { departmentId, fiscalYearId, accountId, startDate, endDate } = req.query;
    const data = await listExpenditures({
      limit, offset,
      departmentId: departmentId ? Number(departmentId) : undefined,
      fiscalYearId: fiscalYearId ? Number(fiscalYearId) : undefined,
      accountId: accountId ? Number(accountId) : undefined,
      startDate, endDate
    });
    res.json(data);
  } catch (e) { next(e); }
});

r.post("/", /* validate(expenditureBody), */ async (req, res, next) => {
  try {
    const created = await createExpenditure(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await getExpenditure(id);
    if (!row) return next({ status: 404 });
    res.json(row);
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getExpenditure(id);
    if (!existing) return next({ status: 404 });
    const updated = await updateExpenditure(id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getExpenditure(id);
    if (!existing) return next({ status: 404 });
    await deleteExpenditure(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
