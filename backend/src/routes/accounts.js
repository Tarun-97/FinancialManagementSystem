import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount
} from "../services/accounts.js";
// Intentionally NOT importing accountBody for update; POST can still use it if desired

const r = Router();

r.get("/", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = await listAccounts({ limit, offset });
    res.json(data);
  } catch (e) { next(e); }
});

// Keep POST validation optional; you can relax it if you want inserts into new columns immediately
r.post("/", /* validate(accountBody), */ async (req, res, next) => {
  try {
    const created = await createAccount(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await getAccount(id);
    if (!row) return next({ status: 404 });
    res.json(row);
  } catch (e) { next(e); }
});

// IMPORTANT: remove strict body validator here to allow dynamic columns to pass through
r.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getAccount(id);
    if (!existing) return next({ status: 404 });
    const updated = await updateAccount(id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getAccount(id);
    if (!existing) return next({ status: 404 });
    await deleteAccount(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
