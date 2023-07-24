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
});
