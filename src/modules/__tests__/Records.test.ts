import SideDrawer from "../..";
import nock from "nock";
import { timeout } from "rxjs";

const BASE_URL = "https://localhost";

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

const RECORD_EXAMPLE = {
  id: "string",
  name: "string",
  description: "string",
  recordSubtype: {
    name: "string",
    logo: "string",
    displayValue: [
      {
        locale: "en-CA",
        value: "string",
        description: "string",
      },
    ],
    orderId: 0,
  },
  recordSubtypeOther: "string",
  storageLocation: "string",
  recordType: {
    name: "string",
    sidedrawerType: "individual",
    sidedrawerTypeOtherName: "string",
    logo: "string",
    displayValue: [
      {
        locale: "en-CA",
        value: "string",
        description: "string",
      },
    ],
    cobrandId: "string",
    orderId: 0,
  },
  status: "string",
  updatedAt: "2023-01-09T15:32:50.006Z",
  lastModifiedBy: "string",
  contributors: ["string"],
};

describe("Records", () => {
  const sd: SideDrawer = new SideDrawer({
    baseUrl: BASE_URL,
    accessToken: "test",
  });

  it("Records.search defined", () => {
    expect(sd.records.obtain).not.toBe(undefined);
  });

  it("Records.search subscribe", (done) => {
    expect.assertions(5);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, {
        data: [RECORD_EXAMPLE],
        hasMore: false,
        nextPage: null,
      });

    sd.records
      .search({
        locale: "en-CA",
        displayInactive: false,
        sidedrawerId: "test",
      })
      .subscribe((response: any) => {
        expect(response).not.toEqual(undefined);

        const { data, hasMore, nextPage } = response;

        expect(data).toBeInstanceOf(Array);
        expect(data.length).toEqual(1);

        expect(hasMore).toEqual(false);
        expect(nextPage).toBeInstanceOf(Function);

        done();
      });
  }, 1500);

  it("Records.search subscribe 2", (done) => {
    expect.assertions(5);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, {
        data: [RECORD_EXAMPLE],
        hasMore: false,
        nextPage: null,
      });

    sd.records
      .search({
        sidedrawerId: "test",
      })
      .subscribe((response: any) => {
        expect(response).not.toEqual(undefined);

        const { data, hasMore, nextPage } = response;

        expect(data).toBeInstanceOf(Array);
        expect(data.length).toEqual(1);

        expect(hasMore).toEqual(false);
        expect(nextPage).toBeInstanceOf(Function);

        done();
      });
  }, 1500);

  it("await Records.search", async () => {
    expect.assertions(8);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, {
        data: [RECORD_EXAMPLE],
        hasMore: false,
        nextPage: null,
      });

    let { data, hasMore, nextPage } = await sd.records.search({
      locale: "en-CA",
      displayInactive: false,
      sidedrawerId: "test",
    });

    expect(data).not.toEqual(undefined);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toEqual(1);

    expect(hasMore).toEqual(false);
    expect(nextPage).not.toEqual(undefined);

    ({ data, hasMore, nextPage } = await nextPage());

    expect(data).toEqual(undefined);
    expect(hasMore).toEqual(undefined);
    expect(nextPage).toEqual(undefined);
  });

  it("Records.search pagination", (done) => {
    expect.assertions(6);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
        name: "test",
      })
      .reply(200, {
        data: Array(20).fill(RECORD_EXAMPLE),
        hasMore: true,
        nextPage: `startingAfter=6449c2926d2a5fcc6c83b6eb&limit=20`,
      });

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        startingAfter: "6449c2926d2a5fcc6c83b6eb",
        limit: 20,
      })
      .reply(200, {
        data: Array(20).fill(RECORD_EXAMPLE),
        hasMore: false,
        nextPage: null,
      });

    sd.records
      .search({
        sidedrawerId: "test",
        name: "test",
      })
      .subscribe({
        next: (response: any) => {
          const { data } = response;

          expect(data).not.toEqual(undefined);
          expect(data).toBeInstanceOf(Array);
          expect(data.length).toEqual(20);
        },
        complete: () => {
          done();
        },
      });
  }, 1500);

  it("await Records.search pagination", async () => {
    expect.assertions(13);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
        name: "test",
        limit: 20,
      })
      .reply(200, {
        data: Array(20).fill(RECORD_EXAMPLE),
        hasMore: true,
        nextPage: `startingAfter=64a56cb6a04a1d94290fd8e6&limit=20`,
      });

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        startingAfter: "64a56cb6a04a1d94290fd8e6",
        limit: 20,
      })
      .reply(200, {
        data: Array(10).fill(RECORD_EXAMPLE),
        hasMore: false,
        nextPage: null,
      });

    let { data, hasMore, nextPage } = await sd.records.search({
      sidedrawerId: "test",
      name: "test",
      limit: 20,
    });

    expect(data).not.toEqual(undefined);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toEqual(20);

    expect(hasMore).toEqual(true);
    expect(nextPage).not.toEqual(undefined);

    ({ data, hasMore, nextPage } = await nextPage());

    expect(data).not.toEqual(undefined);
    expect(data).toBeInstanceOf(Array);
    expect(data.length).toEqual(10);

    expect(hasMore).toEqual(false);
    expect(nextPage).not.toEqual(undefined);

    ({ data, hasMore, nextPage } = await nextPage());

    expect(data).toEqual(undefined);
    expect(hasMore).toEqual(undefined);
    expect(nextPage).toEqual(undefined);
  });

  it("Records.searchRecords fail", async () => {
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test2/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(403, {
        statusCode: 0,
        error: "string",
        message: "string",
      });

    try {
      await sd.records.search({
        locale: "en-CA",
        displayInactive: false,
        sidedrawerId: "test2",
      });
    } catch (err: any) {
      expect(err).not.toEqual(undefined);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain("403");
    }
  });

  it("Records.search timeout", async () => {
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test3/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .delayConnection(2000)
      .reply(403, {
        statusCode: 0,
        error: "string",
        message: "string",
      });

    try {
      await sd.records
        .search({
          locale: "en-CA",
          displayInactive: false,
          sidedrawerId: "test3",
        })
        .pipe(timeout(1000));
    } catch (err: any) {
      expect(err).not.toEqual(undefined);
      expect(err.message).not.toEqual(undefined);
      expect(err.message.toLowerCase()).toContain("timeout");
    }
  });

  it("Records.search fail required params", () => {
    const params = {
      locale: "en-CA",
      displayInactive: false,
      sidedrawerId: "test",
    };

    const requiredParams = ["sidedrawerId"];

    expect.assertions(requiredParams.length * 3);

    for (let i = 0; i < requiredParams.length; i++) {
      const param = requiredParams[i];

      try {
        sd.records.search({
          ...params,
          [param]: undefined,
        });
      } catch (err: any) {
        expect(err).not.toBe(undefined);
        expect(err.message).toContain("required");
        expect(err.message).toContain(param);
      }
    }
  });

  it("Records.obtain defined", () => {
    expect(sd.records.obtain).not.toBe(undefined);
    expect(sd.records.obtain()).toBe(undefined);
  });

  it("Records.create defined", () => {
    expect(sd.records.create).not.toBe(undefined);
    expect(sd.records.create()).toBe(undefined);
  });

  it("Records.update defined", () => {
    expect(sd.records.update).not.toBe(undefined);
    expect(sd.records.update()).toBe(undefined);
  });

  it("Records.delete defined", () => {
    expect(sd.records.delete).not.toBe(undefined);
    expect(sd.records.delete()).toBe(undefined);
  });
});
