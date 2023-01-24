declare var process: unknown;
declare var require: unknown;

export const IS_NODE_ENVIRONMENT =
  typeof process === "object" && typeof require === "function";

export function isRequired(name: string): any {
  throw new Error(`${name} is required.`);
}
