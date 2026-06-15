export function decodeJwtSub(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parseBase64UrlJson(parts[1]);
  if (payload == null || typeof payload !== "object") return null;
  const sub = (payload as Record<string, unknown>).sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}

function parseBase64UrlJson(input: string): unknown {
  try {
    const decoded = base64UrlDecode(input);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf-8");
  }

  const binary = atob(b64);
  if (typeof TextDecoder !== "undefined") {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  return binary;
}
