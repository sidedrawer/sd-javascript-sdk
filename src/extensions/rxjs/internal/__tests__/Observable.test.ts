import "../Observable";

import { from, of, switchMap } from "rxjs";

describe("records", () => {
  it("subscribe", () => {
    expect.assertions(6);

    from([10, 20, 30]).subscribe((result: any) => {
      expect(result).not.toEqual(undefined);
      expect(result).not.toBeNaN();
    });
  });

  it("then", () => {
    expect.assertions(4);

    from([10, 20, 30])
      .then((result) => {
        expect(result).not.toEqual(undefined);
        expect(result).not.toBeNaN();

        return result;
      })
      .then((result) => {
        expect(result).not.toEqual(undefined);
        expect(result).not.toBeNaN();
      });
  });

  it("await", async () => {
    const result = await from([10, 20, 30]);

    expect(result).not.toEqual(undefined);
    expect(result).toEqual(10);
  });

  it("catch", () => {
    expect.assertions(4);

    from([10, 20, 30])
      .then(() => {
        throw new Error("Test Error!");
      })
      .catch((reason) => {
        expect(reason).not.toEqual(undefined);
        expect(reason).not.toEqual("Test Error!");
      });

    from([10, 20, 30])
      .pipe(
        switchMap((n) => {
          if (n === 10) {
            throw new Error("Test Error!");
          }

          return of(n);
        })
      )
      .catch((reason) => {
        expect(reason).not.toEqual(undefined);
        expect(reason).not.toEqual("Test Error!");
      });
  });

  it("try catch", async () => {
    expect.assertions(2);

    try {
      await from([10, 20, 30]).pipe(
        switchMap((n) => {
          if (n === 10) {
            throw new Error("Test Error!");
          }

          return of(n);
        })
      );
    } catch (reason) {
      expect(reason).not.toEqual(undefined);
      expect(reason).not.toEqual("Test Error!");
    }
  });
});
