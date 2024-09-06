import "./extensions/rxjs/internal/Observable";

import Context, { SideDrawerConfig } from "./core/Context";

import Files from "./modules/Files";
import Records from "./modules/Records";

declare global {
  var SideDrawer: unknown;
}

export default class SideDrawer {
  public static Context = Context;
  public static Records = Records;
  public static Files = Files;

  public records: Records;
  public files: Files;
  public context: Context;

  constructor(config: SideDrawerConfig) {
    const context = new Context(config);

    this.context = context;
    this.records = new Records(context);
    this.files = new Files(context);
  }
}

globalThis.SideDrawer = SideDrawer;

export * from "./core/Context";
export * from "./core/HttpService";
export * from "./modules/Files";
export * from "./modules/Records";
export * from "./types/base";
export * from "./types/core";
export * from "./types/files";
export * from "./types/records";
export { SideDrawer };
