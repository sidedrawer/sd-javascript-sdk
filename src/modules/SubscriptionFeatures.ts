import { firstValueFrom } from "rxjs";

import Context from "../core/Context";

/**
 * Shape of the `/api/v1/subscriptions/features/sidedrawer-id/{sidedrawerId}`
 * response. The backend returns a flat key→string map. Only the keys the SDK
 * actually consumes today are typed; the index signature allows passthrough
 * for the rest so future callers can read them without an SDK upgrade.
 */
export interface SubscriptionFeatures {
  /**
   * Maximum upload size for a single file, in megabytes, encoded as a
   * decimal string (e.g. `"600"`). May be missing on legacy subscriptions.
   */
  "sidedrawer.maxUploadMBs"?: string;
  [key: string]: string | undefined;
}

/**
 * Default TTL (in milliseconds) for cached `SubscriptionFeatures` entries.
 * Mirrors the rate at which subscription limits typically change in
 * production (rare, but not "never"), and keeps repeat uploads cheap.
 */
export const SUBSCRIPTION_FEATURES_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  features: SubscriptionFeatures;
  expiresAt: number;
}

/**
 * Internal service that fetches a SideDrawer's subscription features and
 * caches them in memory with a short TTL. Used by `Files.upload` to enforce
 * the upload size limit without forcing every consumer to plumb the value
 * through manually.
 *
 * Not exposed on the public `SideDrawer` instance today; promote to a
 * dedicated module if/when external callers need it.
 */
export class SubscriptionFeaturesService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private context: Context,
    private ttlMs: number = SUBSCRIPTION_FEATURES_CACHE_TTL_MS,
    private now: () => number = () => Date.now()
  ) {}

  /**
   * Returns the subscription features for a SideDrawer, hitting the network
   * only when there is no fresh cached entry. Caller is responsible for
   * handling network errors — this method does not swallow them.
   */
  public async getFeatures(sidedrawerId: string): Promise<SubscriptionFeatures> {
    const cached = this.cache.get(sidedrawerId);
    if (cached && cached.expiresAt > this.now()) {
      return cached.features;
    }

    const features = await firstValueFrom(
      this.context.http.get<SubscriptionFeatures>(
        `/api/v1/subscriptions/features/sidedrawer-id/${sidedrawerId}`
      )
    );

    this.cache.set(sidedrawerId, {
      features,
      expiresAt: this.now() + this.ttlMs,
    });

    return features;
  }

  /**
   * Convenience: returns the parsed `sidedrawer.maxUploadMBs` value (in
   * megabytes) for the SideDrawer, or `null` if the feature is missing /
   * unparseable. Surfaces network errors to the caller (does NOT fail open
   * here — that policy lives in `Files.upload`).
   */
  public async getMaxUploadMBs(sidedrawerId: string): Promise<number | null> {
    const features = await this.getFeatures(sidedrawerId);
    const raw = features["sidedrawer.maxUploadMBs"];
    if (raw == null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  /**
   * Drop the cached entry for `sidedrawerId` (or the entire cache when no id
   * is passed). Useful from tests and from app code that just upgraded the
   * SideDrawer's plan and wants the next upload to re-check the limit.
   */
  public invalidate(sidedrawerId?: string): void {
    if (sidedrawerId == null) {
      this.cache.clear();
      return;
    }
    this.cache.delete(sidedrawerId);
  }
}

export default SubscriptionFeaturesService;
