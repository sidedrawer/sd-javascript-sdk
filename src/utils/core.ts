export function isBrowserEnvironment(): boolean {
  return process.env.NODE_ENV === "browser";
}

export function isNodeEnvironment(): boolean {
  return process.env.NODE_ENV !== "browser";
}

export function isRequired(name: string): any {
  throw new Error(`${name} is required.`);
}
