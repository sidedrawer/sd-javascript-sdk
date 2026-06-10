import { createDevServer } from "./mock-api.mjs";

const port = Number(process.env.PORT ?? 3456);

const { server, baseUrl } = await createDevServer({ port });

console.log(`SDK smoke-test UI: ${baseUrl}`);
console.log(`Mock API:          ${baseUrl}/api/...`);
console.log(`Press Ctrl+C to stop.`);

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
