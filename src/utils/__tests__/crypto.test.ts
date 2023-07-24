import "../../extensions/global/crypto.node";

import { generateHash } from "../crypto";

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
  });
});
