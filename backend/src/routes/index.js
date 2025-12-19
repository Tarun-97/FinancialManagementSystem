import { Router } from "express";

import accounts from "./accounts.js";
import budgets from "./budgets.js";
import departments from "./departments.js";
import expenditures from "./expenditures.js";
import fiscalYears from "./fiscalYears.js";
import states from "./states.js";
import analytics from "./analytics.js";
import ddl from "./ddl.js";
import views from "./views.js";  // ADD THIS LINE
import queryBuilder from "./queryBuilder.js"; // NEW

const r = Router();

r.use("/accounts", accounts);
r.use("/budgets", budgets);
r.use("/departments", departments);
r.use("/expenditures", expenditures);
r.use("/fiscal-years", fiscalYears);
r.use("/states", states);
r.use("/analytics", analytics);
r.use("/ddl", ddl);
r.use("/db", views);  // ADD THIS LINE - routes will be /api/v1/db/views, /api/v1/db/procedures, etc.
r.use("/dbuilder", queryBuilder); // NEW: /api/v1/dbuilder/...

export default r;
