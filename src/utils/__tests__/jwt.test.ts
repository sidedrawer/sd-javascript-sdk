import { decodeJwtSub } from "../jwt";

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature-placeholder`;
}

describe("decodeJwtSub", () => {
  it("returns the sub claim for a well-formed JWT", () => {
    const token = makeJwt({ sub: "user-123", email: "x@y.z" });
    expect(decodeJwtSub(token)).toBe("user-123");
  });

  it("handles unsigned JWTs with no third segment", () => {
    const header = encodeBase64Url(JSON.stringify({ alg: "none" }));
    const body = encodeBase64Url(JSON.stringify({ sub: "user-456" }));
    expect(decodeJwtSub(`${header}.${body}`)).toBe("user-456");
  });

  it("returns null when sub is missing", () => {
    const token = makeJwt({ email: "x@y.z" });
    expect(decodeJwtSub(token)).toBeNull();
  });

  it("returns null when sub is empty", () => {
    const token = makeJwt({ sub: "" });
    expect(decodeJwtSub(token)).toBeNull();
  });

  it("returns null when sub is not a string", () => {
    const token = makeJwt({ sub: 42 as unknown as string });
    expect(decodeJwtSub(token)).toBeNull();
  });

  it("returns null for opaque (non-JWT) tokens", () => {
    expect(decodeJwtSub("just-an-opaque-token")).toBeNull();
    expect(decodeJwtSub("not.a-jwt")).toBeNull();
  });

  it("returns null for nullish / empty input", () => {
    expect(decodeJwtSub(null)).toBeNull();
    expect(decodeJwtSub(undefined)).toBeNull();
    expect(decodeJwtSub("")).toBeNull();
  });

  it("returns null when the payload is not valid base64url JSON", () => {
    expect(decodeJwtSub("header.@@@notbase64@@@.sig")).toBeNull();
    const garbage = encodeBase64Url("not json");
    expect(decodeJwtSub(`header.${garbage}.sig`)).toBeNull();
  });

  it("correctly decodes a payload containing UTF-8 characters", () => {
    const token = makeJwt({ sub: "usér-ñ-中" });
    expect(decodeJwtSub(token)).toBe("usér-ñ-中");
  });
});
