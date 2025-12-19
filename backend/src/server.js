import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";

const server = createServer(app);
const port = env.PORT;

server.listen(port, () => {
  console.log(`FMS backend listening on http://localhost:${port}`);
});
