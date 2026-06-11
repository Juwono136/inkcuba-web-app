const STORAGE_KEY = "inkcuba.remember_login_v1";
const KEY_MATERIAL = "inkcuba-remember-credentials-v1";
const KEY_SALT = "inkcuba-device-salt";

type StoredPayload = {
  v: 1;
  email: string;
  ciphertext: string;
  iv: string;
};

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBuffer(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(KEY_MATERIAL),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(KEY_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function saveRememberedCredentials(
  email: string,
  password: string,
): Promise<void> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return;
  }

  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  );

  const payload: StoredPayload = {
    v: 1,
    email: email.trim().toLowerCase(),
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadRememberedCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as StoredPayload;

    if (payload.v !== 1 || !payload.email || !payload.ciphertext || !payload.iv) {
      clearRememberedCredentials();
      return null;
    }

    const key = await getCryptoKey();
    const iv = new Uint8Array(base64ToBuffer(payload.iv));
    const ciphertext = new Uint8Array(base64ToBuffer(payload.ciphertext));

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return {
      email: payload.email,
      password: new TextDecoder().decode(decrypted),
    };
  } catch {
    clearRememberedCredentials();
    return null;
  }
}

export function clearRememberedCredentials(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
