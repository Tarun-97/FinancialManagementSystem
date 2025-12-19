import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
// import { budgetBody } from "../validators/budgets.js";
import {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget
} from "../services/budgets.js";

const r = Router();

r.get("/", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { departmentId, fiscalYearId, accountId } = req.query;
    const data = await listBudgets({
      limit,
      offset,
      departmentId: departmentId ? Number(departmentId) : undefined,
      fiscalYearId: fiscalYearId ? Number(fiscalYearId) : undefined,
      accountId: accountId ? Number(accountId) : undefined
    });
    res.json(data);
  } catch (e) { next(e); }
});

r.post("/", /* validate(budgetBody), */ async (req, res, next) => {
  try {
    const created = await createBudget(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await getBudget(id);
    if (!row) return next({ status: 404 });
    res.json(row);
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getBudget(id);
    if (!existing) return next({ status: 404 });
    const updated = await updateBudget(id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getBudget(id);
    if (!existing) return next({ status: 404 });
    await deleteBudget(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
