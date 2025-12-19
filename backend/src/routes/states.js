import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
// import { stateBody } from "../validators/states.js";
import {
  listStates,
  getState,
  createState,
  updateState,
  deleteState
} from "../services/states.js";

const r = Router();

r.get("/", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = await listStates({ limit, offset });
    res.json(data);
  } catch (e) { next(e); }
});

r.post("/", /* validate(stateBody), */ async (req, res, next) => {
  try {
    const created = await createState(req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

r.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await getState(id);
    if (!row) return next({ status: 404 });
    res.json(row);
  } catch (e) { next(e); }
});

r.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getState(id);
    if (!existing) return next({ status: 404 });
    const updated = await updateState(id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await getState(id);
    if (!existing) return next({ status: 404 });
    await deleteState(id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
