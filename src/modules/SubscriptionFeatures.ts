import { firstValueFrom } from "rxjs";

import Context from "../core/Context";

export interface SubscriptionFeatures {
  "sidedrawer.maxUploadMBs"?: string;
  [key: string]: string | undefined;
}

export const SUBSCRIPTION_FEATURES_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  features: SubscriptionFeatures;
  expiresAt: number;
}

export class SubscriptionFeaturesService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private context: Context,
    private ttlMs: number = SUBSCRIPTION_FEATURES_CACHE_TTL_MS,
    private now: () => number = () => Date.now()
  ) {}

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

  public async getMaxUploadMBs(sidedrawerId: string): Promise<number | null> {
    const features = await this.getFeatures(sidedrawerId);
    const raw = features["sidedrawer.maxUploadMBs"];
    if (raw == null) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  public invalidate(sidedrawerId?: string): void {
    if (sidedrawerId == null) {
      this.cache.clear();
      return;
    }
    this.cache.delete(sidedrawerId);
  }
}

export default SubscriptionFeaturesService;
