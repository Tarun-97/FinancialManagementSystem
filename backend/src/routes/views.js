import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { paginationQuery } from "../validators/common.js";
import { parsePagination } from "../utils/pagination.js";
import {
  listViews,
  getViewDefinition,
  createView,
  dropView,
  queryView,
  listProcedures,
  getProcedureDefinition,
  createProcedure,
  dropProcedure,
  callProcedure,
  listTables,
  getTableColumns
} from "../services/views.js";

const r = Router();

// ========== VIEWS ==========

// Get all views
r.get("/views", async (req, res, next) => {
  try {
    const items = await listViews();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Get view definition
r.get("/views/:viewName", async (req, res, next) => {
  try {
    const data = await getViewDefinition(req.params.viewName);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// Create a view
r.post("/views", async (req, res, next) => {
  try {
    const { viewName, selectQuery } = req.body;
    const created = await createView(viewName, selectQuery);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// Drop a view
r.delete("/views/:viewName", async (req, res, next) => {
  try {
    await dropView(req.params.viewName);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Query a view with pagination
r.get("/views/:viewName/data", validate(paginationQuery, "query"), async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const data = await queryView(req.params.viewName, { limit, offset });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// ========== PROCEDURES ==========

// Get all stored procedures
r.get("/procedures", async (req, res, next) => {
  try {
    const items = await listProcedures();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Get procedure definition
r.get("/procedures/:procedureName", async (req, res, next) => {
  try {
    const data = await getProcedureDefinition(req.params.procedureName);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// Create a stored procedure
r.post("/procedures", async (req, res, next) => {
  try {
    const { procedureName, parameters, body } = req.body;
    const created = await createProcedure(procedureName, parameters, body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// Drop a stored procedure
r.delete("/procedures/:procedureName", async (req, res, next) => {
  try {
    await dropProcedure(req.params.procedureName);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// Call a stored procedure
r.post("/procedures/:procedureName/call", async (req, res, next) => {
  try {
    const result = await callProcedure(
      req.params.procedureName,
      req.body.parameters || []
    );
    res.json({ result });
  } catch (e) {
    next(e);
  }
});

// ========== HELPER ROUTES ==========

// Get available tables for view creation
r.get("/tables", async (req, res, next) => {
  try {
    const items = await listTables();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// Get table columns
r.get("/tables/:tableName/columns", async (req, res, next) => {
  try {
    const columns = await getTableColumns(req.params.tableName);
    res.json({ columns });
  } catch (e) {
    next(e);
  }
});

export default r;
