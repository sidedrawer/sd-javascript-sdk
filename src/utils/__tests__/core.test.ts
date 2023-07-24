import { isRequired, isNodeEnvironment, isBrowserEnvironment } from "../core";

describe("utils", () => {
  describe("core", () => {
    it("isNodeEnvironment", () => {
      expect(isNodeEnvironment).not.toEqual(undefined);

      process.env.NODE_ENV = undefined;
      expect(isNodeEnvironment()).toEqual(true);

      process.env.NODE_ENV = "production";
      expect(isNodeEnvironment()).toEqual(true);

      process.env.NODE_ENV = "browser";
      expect(isNodeEnvironment()).toEqual(false);
    });

    it("isBrowserEnvironment", () => {
      expect(isBrowserEnvironment).not.toEqual(undefined);

      process.env.NODE_ENV = undefined;
      expect(isBrowserEnvironment()).toEqual(false);

      process.env.NODE_ENV = "production";
      expect(isBrowserEnvironment()).toEqual(false);

      process.env.NODE_ENV = "browser";
      expect(isBrowserEnvironment()).toEqual(true);
    });

    it("isRequired", () => {
      expect.assertions(4);
      expect(isRequired).not.toEqual(undefined);

      try {
        isRequired("test");
      } catch (err: any) {
        expect(err).not.toEqual(undefined);
        expect(err.message).not.toEqual(undefined);
        expect(err.message).toBe("test is required.");
      }
    });
  });
});
