import { sha256 } from "@noble/hashes/sha2.js";

export async function generateHash(
  arrayBuffer: ArrayBuffer,
  algorithm: AlgorithmIdentifier = "SHA-256"
): Promise<string> {
  const hashAsArrayBuffer: ArrayBuffer = await crypto.subtle.digest(
    algorithm,
    arrayBuffer
  );

  const uint8ViewOfHash: Uint8Array = new Uint8Array(hashAsArrayBuffer);
  const hashAsString: string = Array.from(uint8ViewOfHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashAsString;
}

/**
 * Incremental SHA-256 hasher.
 *
 * Web Crypto's `crypto.subtle.digest` only supports hashing a complete
 * buffer; for large files this forces the SDK to either read the whole
 * file into memory twice (once for block uploads, once for the final
 * checksum) or stage the bytes elsewhere. This helper lets the caller
 * feed chunks as they are read, so the whole-file SHA-256 is available
 * with constant extra memory.
 *
 * Backed by `@noble/hashes/sha256`, which produces the same digest as
 * `crypto.subtle.digest("SHA-256", buffer)`, so consumers and the
 * backend (`checkSum` query param for `createRecordFile`) keep seeing
 * the same value.
 *
 * Usage:
 * ```ts
 * const hasher = createSha256Hasher();
 * hasher.update(chunk1);
 * hasher.update(chunk2);
 * const checksum = hasher.digest(); // hex string
 * ```
 */
export interface IncrementalHasher {
  update(data: Uint8Array | ArrayBuffer): void;
  /** Finalises the hash and returns the hex-encoded digest. */
  digest(): string;
}

export function createSha256Hasher(): IncrementalHasher {
  const hasher = sha256.create();

  return {
    update(data: Uint8Array | ArrayBuffer): void {
      const bytes =
        data instanceof Uint8Array ? data : new Uint8Array(data);
      hasher.update(bytes);
    },
    digest(): string {
      const out = hasher.digest();
      let hex = "";
      for (let i = 0; i < out.length; i++) {
        hex += out[i].toString(16).padStart(2, "0");
      }
      return hex;
    },
  };
}
