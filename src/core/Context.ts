import HttpService from "./HttpService";
import { decodeJwtSub } from "../utils/jwt";

export interface SideDrawerConfig {
  accessToken?: string;
  locale?: string;
  baseUrl?: string;
}

// Todo: use environments
const API_URL = "https://api.sidedrawer.com";

const CONFIG_DEFAULTS = {
  baseUrl: API_URL,
  locale: "en-CA",
};

const privateScope = new WeakMap();

/**
 * Module base class
 */
export default class Context {
  /**
   * @param config SideDrawer SDK configurations
   */
  constructor(config: SideDrawerConfig) {
    this.refresh(config);
  }

  public refresh(config: SideDrawerConfig) {
    const configWithDefaults = {
      ...CONFIG_DEFAULTS,
      ...config,
    } satisfies SideDrawerConfig;

    const http = new HttpService({
      baseURL: configWithDefaults.baseUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${configWithDefaults.accessToken}`
      },
    });

    const userId = decodeJwtSub(configWithDefaults.accessToken);

    privateScope.set(this, {
      configWithDefaults,
      http,
      userId,
    });
  }

  /** @ignore */
  get config(): SideDrawerConfig {
    return privateScope.get(this).configWithDefaults;
  }

  /** @ignore */
  get http(): HttpService {
    return privateScope.get(this).http;
  }

  /**
   * User id derived from the `sub` claim of the configured access token
   * when it is a JWT. Returns `null` for opaque tokens, missing tokens,
   * or JWTs without a `sub` claim. Refreshed automatically when
   * {@link refresh} is called with a new access token.
   */
  get userId(): string | null {
    return privateScope.get(this).userId ?? null;
  }

  /** @ignore */
  get locale(): string {
    let locale = this.config.locale;

    if (locale == null) {
      locale = CONFIG_DEFAULTS.locale;
    }

    return locale;
  }
}

export { Context };
