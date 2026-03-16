// client/encryptFile.js
// Usage: const {cid, ivB64, wrappedKeyB64, cipherBlob} = await encryptAndPrepare(file, wrapWithPublicKeyPem)
async function generateAesKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function exportRawKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromBase64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function encryptFile(file, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV (recommended)
  const data = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { cipher, iv: iv.buffer };
}

// Optionally wrap AES key with an RSA public key (PEM) using SubtleCrypto.importKey + wrapKey
async function wrapKeyWithRSAPublic(rawKeyBytes, rsaPublicPem) {
  // parse PEM -> SPKI
  const pem = rsaPublicPem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  const binaryDer = fromBase64(pem);
  const pubKey = await crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey"]
  );
  // re-import AES raw key as CryptoKey to allow wrapKey
  const aesKey = await crypto.subtle.importKey("raw", rawKeyBytes.buffer, "AES-GCM", true, ["encrypt", "decrypt"]);
  const wrapped = await crypto.subtle.wrapKey("raw", aesKey, pubKey, { name: "RSA-OAEP" });
  return wrapped; // ArrayBuffer
}

export async function encryptAndPrepare(file, rsaPublicPem = null) {
  const aesKey = await generateAesKey();
  const raw = await exportRawKey(aesKey); // Uint8Array
  const { cipher, iv } = await encryptFile(file, aesKey);
  let wrappedKeyB64 = null;
  if (rsaPublicPem) {
    const wrapped = await wrapKeyWithRSAPublic(raw, rsaPublicPem);
    wrappedKeyB64 = toBase64(wrapped);
  } else {
    // farmer retains raw key; show as download or base64 to user
    wrappedKeyB64 = toBase64(raw.buffer);
  }
  return {
    cipherBlob: new Blob([cipher]),
    ivB64: toBase64(iv),
    wrappedKeyB64, // base64 of wrapped key (or raw key if no wrapping)
  };
}
