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
