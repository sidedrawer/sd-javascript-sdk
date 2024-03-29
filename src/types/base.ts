export type Metadata = Record<string, string | number | boolean>;

export interface DisplayValue {
  locale: string;
  value: string;
  description?: string;
}

export interface ExternalKey {
  key: string;
  value: string;
}

export type ExternalKeys = ExternalKey[];
