import SideDrawer from "..";

describe("main", () => {
  describe("methods", () => {
    const sd = new SideDrawer({
      accessToken: "test",
    });

    it("records", () => {
      expect(sd.records).not.toEqual(undefined);
      expect(sd.records.search).not.toEqual(undefined);
      expect(sd.records.obtain).not.toEqual(undefined);
      expect(sd.records.create).not.toEqual(undefined);
      expect(sd.records.update).not.toEqual(undefined);
      expect(sd.records.delete).not.toEqual(undefined);
    });

    it("files", () => {
      expect(sd.files).not.toEqual(undefined);
      expect(sd.files.upload).not.toEqual(undefined);
    });
  });
});
