import "../../extensions/global/crypto.node";

import { createSha256Hasher, generateHash } from "../crypto";

async function generateArrayBuffer(sizeInBytes = 1024): Promise<ArrayBuffer> {
  const buffer = Buffer.alloc(sizeInBytes);
  const blob = new Blob([buffer]);

  return await blob.arrayBuffer();
}

describe("utils", () => {
  describe("crypto", () => {
    it("generateHash", async () => {
      const arrayBuffer: ArrayBuffer = await generateArrayBuffer();

      const hash: string = await generateHash(arrayBuffer);
      const hash1: string = await generateHash(arrayBuffer, "SHA-1");
      const hash256: string = await generateHash(arrayBuffer, "SHA-256");
      const hash384: string = await generateHash(arrayBuffer, "SHA-384");
      const hash512: string = await generateHash(arrayBuffer, "SHA-512");

      expect(hash).not.toEqual(undefined);
      expect(hash1).not.toEqual(undefined);
      expect(hash256).not.toEqual(undefined);
      expect(hash384).not.toEqual(undefined);
      expect(hash512).not.toEqual(undefined);

      expect(hash).toEqual(hash256);

      expect(hash).toEqual("5f70bf18a086007016e948b04aed3b82103a36bea41755b6cddfaf10ace3c6ef");
      expect(hash1).toEqual("60cacbf3d72e1e7834203da608037b1bf83b40e8");
      expect(hash256).toEqual("5f70bf18a086007016e948b04aed3b82103a36bea41755b6cddfaf10ace3c6ef");
      expect(hash384).toEqual("ccdfa1aec6214bf6db74b4addaca7f87ab5980bcfdbf6f5fcab8d8425bc2169ca3bc9dd6046b26e4b1da6ba33c31dfb0");
      expect(hash512).toEqual("8efb4f73c5655351c444eb109230c556d39e2c7624e9c11abc9e3fb4b9b9254218cc5085b454a9698d085cfa92198491f07a723be4574adc70617b73eb0b6461");
    });

    // SPD-3781 Phase 1: incremental hashing for memory-safe uploads.
    // The whole point is that hashing N chunks separately produces the
    // exact same digest as hashing the concatenated buffer in one shot;
    // otherwise the SDK would send a wrong `checkSum` query param to
    // `createRecordFile`.
    describe("createSha256Hasher", () => {
      it("produces the same digest as generateHash for a single chunk", async () => {
        const buffer = await generateArrayBuffer(1024);
        const whole = await generateHash(buffer, "SHA-256");

        const hasher = createSha256Hasher();
        hasher.update(buffer);
        expect(hasher.digest()).toEqual(whole);
      });

      it("incremental update across N chunks matches a single-buffer hash", async () => {
        const total = 4 * 1024 * 1024 + 123; // intentionally non-aligned tail
        const fullBuffer = Buffer.alloc(total).map(
          (_, i) => (i * 31 + 7) & 0xff
        );
        const expected = await generateHash(
          fullBuffer.buffer.slice(
            fullBuffer.byteOffset,
            fullBuffer.byteOffset + fullBuffer.byteLength
          ),
          "SHA-256"
        );

        // Feed the same bytes in arbitrarily-sized chunks (uneven on
        // purpose) — the digest must not depend on chunk boundaries.
        const hasher = createSha256Hasher();
        const chunkSizes = [
          1024,
          64 * 1024,
          512 * 1024,
          1024 * 1024,
          2 * 1024 * 1024,
          total -
            (1024 + 64 * 1024 + 512 * 1024 + 1024 * 1024 + 2 * 1024 * 1024),
        ];
        let offset = 0;
        for (const size of chunkSizes) {
          const slice = fullBuffer.subarray(offset, offset + size);
          hasher.update(
            slice.buffer.slice(
              slice.byteOffset,
              slice.byteOffset + slice.byteLength
            )
          );
          offset += size;
        }
        expect(offset).toBe(total);

        expect(hasher.digest()).toEqual(expected);
      });

      it("accepts Uint8Array and ArrayBuffer interchangeably", () => {
        const bytes = new Uint8Array([1, 2, 3, 4, 5]);

        const a = createSha256Hasher();
        a.update(bytes);

        const b = createSha256Hasher();
        b.update(bytes.buffer);

        expect(a.digest()).toEqual(b.digest());
      });
    });
  });
});
