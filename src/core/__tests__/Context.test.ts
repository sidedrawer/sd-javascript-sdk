import Context from "../Context";
import HttpService from "../HttpService";

describe("core", () => {
  let context: Context;

  it("Context.constructor", () => {
    context = new Context({
      accessToken: 'test'
    });
  });

  it("Context.config", () => {
    expect.assertions(7);

    expect(context.config).not.toEqual(undefined);
    expect(context.config.accessToken).not.toEqual(undefined);
    expect(context.config.locale).not.toEqual(undefined);
    expect(context.config.baseUrl).not.toEqual(undefined);

    expect(context.config.accessToken).toEqual("test");
    expect(context.config.locale).toEqual("en-CA");
    expect(context.config.baseUrl).toEqual("https://api.sidedrawer.com"); 
  });

  it("Context.locale", () => {
    expect.assertions(6);

    expect(context.locale).not.toEqual(undefined);
    expect(context.locale).toEqual(context.config.locale);
    expect(context.locale).toEqual("en-CA");

    const context2 = new Context({
      // @ts-ignore
      locale: null
    });

    expect(context2.locale).not.toEqual(undefined);
    expect(context2.locale).not.toEqual(context2.config.locale);
    expect(context2.locale).toEqual("en-CA");
  });

  it("Context.http", () => {
    expect.assertions(2);

    expect(context.http).not.toEqual(undefined);
    expect(context.http).toBeInstanceOf(HttpService);
  });

  describe("Context.userId (JWT `sub` decoding)", () => {
    function encodeBase64Url(input: string): string {
      return Buffer.from(input, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    }
    function jwtFor(sub: string): string {
      const header = encodeBase64Url(JSON.stringify({ alg: "none" }));
      const body = encodeBase64Url(JSON.stringify({ sub }));
      return `${header}.${body}.sig`;
    }

    it("returns null when no access token is configured", () => {
      const c = new Context({});
      expect(c.userId).toBeNull();
    });

    it("returns null when the access token is opaque (non-JWT)", () => {
      const c = new Context({ accessToken: "opaque-token-value" });
      expect(c.userId).toBeNull();
    });

    it("returns the JWT sub claim", () => {
      const c = new Context({ accessToken: jwtFor("user-123") });
      expect(c.userId).toBe("user-123");
    });

    it("recomputes userId when refresh() is called with a new token", () => {
      const c = new Context({ accessToken: jwtFor("alice") });
      expect(c.userId).toBe("alice");
      c.refresh({ accessToken: jwtFor("bob") });
      expect(c.userId).toBe("bob");
      c.refresh({ accessToken: "opaque" });
      expect(c.userId).toBeNull();
    });
  });
});
