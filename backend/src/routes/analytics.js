import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { utilizationQuery, monthlyQuery, byTypeQuery, topDepartmentsQuery } from "../validators/analytics.js";
import { utilization, monthlyExpenditure, byAccountType, topDepartments } from "../services/analytics.js";

const r = Router();

// Coercion helpers
const numOrUndef = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function monthRangeFromQuery(q) {
  // q.startMonth, q.endMonth: "YYYY-MM"
  const { startMonth, endMonth } = q || {};
  const start = startMonth ? new Date(`${startMonth}-01T00:00:00Z`) : undefined;
  const end = endMonth ? new Date(new Date(`${endMonth}-01T00:00:00Z`).getFullYear(),
                                 new Date(`${endMonth}-01T00:00:00Z`).getMonth() + 1, 0, 23, 59, 59, 999) : undefined;
  return { startDate: start, endDate: end };
}

r.get("/utilization", validate(utilizationQuery, "query"), async (req, res, next) => {
  try {
    const departmentId = numOrUndef(req.query.departmentId);
    const fiscalYearId = numOrUndef(req.query.fiscalYearId);
    const { startDate, endDate } = monthRangeFromQuery(req.query);
    const data = await utilization({ departmentId, fiscalYearId, startDate, endDate });
    res.json(data);
  } catch (e) { next(e); }
});

r.get("/monthly-expenditure", validate(monthlyQuery, "query"), async (req, res, next) => {
  try {
    const departmentId = numOrUndef(req.query.departmentId);
    const fiscalYearId = numOrUndef(req.query.fiscalYearId);
    const { startDate, endDate } = monthRangeFromQuery(req.query);
    const data = await monthlyExpenditure({ departmentId, fiscalYearId, startDate, endDate });
    res.json(data);
  } catch (e) { next(e); }
});

r.get("/by-account-type", validate(byTypeQuery, "query"), async (req, res, next) => {
  try {
    const departmentId = numOrUndef(req.query.departmentId);
    const fiscalYearId = numOrUndef(req.query.fiscalYearId);
    const { startDate, endDate } = monthRangeFromQuery(req.query);
    const data = await byAccountType({ departmentId, fiscalYearId, startDate, endDate });
    res.json(data);
  } catch (e) { next(e); }
});

r.get("/top-departments", validate(topDepartmentsQuery, "query"), async (req, res, next) => {
  try {
    // CRITICAL: sanitize limit and never pass NaN
    const limit = Number.isFinite(Number(req.query.limit)) ? Math.min(50, Math.max(1, Number(req.query.limit))) : 5;
    const fiscalYearId = numOrUndef(req.query.fiscalYearId);
    const departmentId = numOrUndef(req.query.departmentId);
    const { startDate, endDate } = monthRangeFromQuery(req.query);
    const data = await topDepartments({ limit, fiscalYearId, departmentId, startDate, endDate });
    res.json(data);
  } catch (e) { next(e); }
});

export default r;
