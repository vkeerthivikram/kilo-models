import { createServer } from "node:http";
import { catalog } from "./catalog";

const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health") response.end(JSON.stringify({ ready: true }));
  else if (request.url?.startsWith("/api/gateway/models")) response.end(JSON.stringify({ data: catalog }));
  else {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Fixture route not found" }));
  }
});

server.listen(3211, "127.0.0.1");
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
