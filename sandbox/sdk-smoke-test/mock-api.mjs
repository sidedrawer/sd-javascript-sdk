import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SIDEDRAWER_ID = "test";
export const RECORD_ID = "test";
export const DOWNLOAD_TOKEN = "smoke-token";
export const FINALIZE_ID = "smoke-test-id";

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function sendJson(res, statusCode, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

async function serveStatic(res, filePath) {
  const content = await readFile(filePath);
  const ext = filePath.slice(filePath.lastIndexOf("."));
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream" });
  res.end(content);
}

/**
 * Handle mock API routes. Returns true if the request was handled.
 */
export async function handleMockApi(req, res, options = {}) {
  const { slowBlockUploadMs = 0 } = options;
  const url = new URL(req.url, "http://127.0.0.1");
  const { pathname, searchParams } = url;

  if (req.method === "GET" && pathname === "/api/v2/smoke/trigger-404") {
    sendJson(res, 404, { message: "not found" });
    return true;
  }

  if (
    req.method === "GET" &&
    pathname ===
      `/api/v2/records/sidedrawer/sidedrawer-id/${SIDEDRAWER_ID}/records`
  ) {
    sendJson(res, 200, [{ id: "record-1", name: "Smoke Test Record" }]);
    return true;
  }

  if (
    req.method === "POST" &&
    pathname ===
      `/api/v2/blocks/sidedrawer/sidedrawer-id/${SIDEDRAWER_ID}/records/record-id/${RECORD_ID}/upload`
  ) {
    await readBody(req);

    if (slowBlockUploadMs > 0) {
      await new Promise((r) => setTimeout(r, slowBlockUploadMs));
    }

    const order = parseInt(searchParams.get("order") ?? "0", 10);
    sendJson(res, 200, {
      hash: `hash-${order}-${Date.now()}`,
      order,
    });
    return true;
  }

  if (
    req.method === "POST" &&
    pathname ===
      `/api/v2/record-files/sidedrawer/sidedrawer-id/${SIDEDRAWER_ID}/records/record-id/${RECORD_ID}/record-files`
  ) {
    await readBody(req);

    if (
      searchParams.get("fileName") == null ||
      searchParams.get("uploadTitle") == null ||
      searchParams.get("fileType") == null ||
      searchParams.get("checkSum") == null
    ) {
      sendJson(res, 400, { message: "missing query params" });
      return true;
    }

    sendJson(res, 200, { id: FINALIZE_ID });
    return true;
  }

  if (
    req.method === "GET" &&
    pathname ===
      `/api/v2/record-files/sidedrawer/sidedrawer-id/${SIDEDRAWER_ID}/records/record-id/${RECORD_ID}/record-files/${DOWNLOAD_TOKEN}`
  ) {
    const body = Buffer.alloc(64 * 1024, 0xab);
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": body.length,
    });
    res.end(body);
    return true;
  }

  return false;
}

export function createMockServer(options = {}) {
  const { slowBlockUploadMs = 0, port = 0, host = "127.0.0.1" } = options;

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const handled = await handleMockApi(req, res, { slowBlockUploadMs });
        if (handled) {
          return;
        }

        sendJson(res, 404, {
          message: `unhandled route: ${req.method} ${req.url}`,
        });
      } catch (err) {
        sendJson(res, 500, { message: String(err) });
      }
    });

    server.on("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://${host}:${address.port}`,
      });
    });
  });
}

export function createDevServer(options = {}) {
  const {
    port = 3456,
    host = "127.0.0.1",
    slowBlockUploadMs = 0,
    sdkPath = join(__dirname, "../../dist/index.browser.js"),
    publicDir = join(__dirname, "public"),
  } = options;

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${host}`);

        if (url.pathname.startsWith("/api/")) {
          const handled = await handleMockApi(req, res, { slowBlockUploadMs });
          if (!handled) {
            sendJson(res, 404, {
              message: `unhandled route: ${req.method} ${url.pathname}`,
            });
          }
          return;
        }

        if (url.pathname === "/sdk/index.browser.js") {
          await serveStatic(res, sdkPath);
          return;
        }

        let filePath;
        if (url.pathname === "/" || url.pathname === "/index.html") {
          filePath = join(publicDir, "index.html");
        } else {
          filePath = join(publicDir, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
        }

        await serveStatic(res, filePath);
      } catch (err) {
        if (err.code === "ENOENT") {
          sendJson(res, 404, { message: "not found" });
          return;
        }
        sendJson(res, 500, { message: String(err) });
      }
    });

    server.on("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://${host}:${address.port}`,
      });
    });
  });
}
