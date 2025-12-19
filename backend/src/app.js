import express from "express";
import morgan from "morgan";
import { corsMiddleware } from "./middleware/cors.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errors.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);
app.use(morgan("dev"));

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
