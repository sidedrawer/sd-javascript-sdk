import { webcrypto } from "crypto";
import { isNodeEnvironment } from "./core";

export async function getWebCrypto(): Promise<webcrypto.Crypto | Crypto> {
  let crypto;

  if (isNodeEnvironment()) {
    const { webcrypto } = await import("node:crypto");

    crypto = webcrypto;
  } else {
    crypto = window.crypto;
  }

  return crypto;
}

export async function generateHash(
  arrayBuffer: ArrayBuffer,
  algorithm: AlgorithmIdentifier = "SHA-256"
): Promise<string> {
  const webCrypto = await getWebCrypto();
  const hashAsArrayBuffer: ArrayBuffer = await webCrypto.subtle.digest(
    algorithm,
    arrayBuffer
  );

  const uint8ViewOfHash: Uint8Array = new Uint8Array(hashAsArrayBuffer);
  const hashAsString: string = Array.from(uint8ViewOfHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashAsString;
}
