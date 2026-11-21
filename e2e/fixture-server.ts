import { createServer } from "node:http";
import { catalog } from "./catalog";

const testGatewayFaults = process.env.KILO_MODELS_FAULT_TEST === "1";
let available = true;

const server = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  if (request.url === "/health") response.end(JSON.stringify({ ready: true }));
  else if (testGatewayFaults && request.method === "POST" &&
      (request.url === "/fault/available" || request.url === "/fault/unavailable")) {
    available = request.url === "/fault/available";
    response.end(JSON.stringify({ available }));
  } else if (request.url?.startsWith("/api/gateway/models")) {
    response.statusCode = available ? 200 : 503;
    response.end(JSON.stringify(available ? { data: catalog } : { error: "Test gateway unavailable" }));
  } else {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Fixture route not found" }));
  }
});

server.listen(3211, "127.0.0.1");
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
