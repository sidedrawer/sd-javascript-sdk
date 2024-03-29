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
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, [RECORD_EXAMPLE]);

    sd.records
      .search({
        locale: "en-CA",
        displayInactive: false,
        sidedrawerId: "test",
      })
      .subscribe((records: any) => {
        expect(records).not.toEqual(undefined);
        expect(records).toBeInstanceOf(Array);
        expect(records.length).toEqual(1);

        done();
      });
  }, 1500);

  it("Records.search subscribe 2", (done) => {
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, [RECORD_EXAMPLE]);

    sd.records
      .search({
        sidedrawerId: "test",
      })
      .subscribe((records: any) => {
        expect(records).not.toEqual(undefined);
        expect(records).toBeInstanceOf(Array);
        expect(records.length).toEqual(1);

        done();
      });
  }, 1500);

  it("await Records.search", async () => {
    expect.assertions(3);

    nock(BASE_URL)
      .get(`/api/v2/records/sidedrawer/sidedrawer-id/test/records`)
      .query({
        locale: "en-CA",
        displayInactive: false,
      })
      .reply(200, [RECORD_EXAMPLE]);

    const records = await sd.records.search({
      locale: "en-CA",
      displayInactive: false,
      sidedrawerId: "test",
    });

    expect(records).not.toEqual(undefined);
    expect(records).toBeInstanceOf(Array);
    expect(records.length).toEqual(1);
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
