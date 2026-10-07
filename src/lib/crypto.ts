import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * 외부 서비스 토큰(Notion 등) 저장용 AES-256-GCM 암호화.
 * 키는 APP_ENCRYPTION_KEY 에서 SHA-256 으로 유도한다.
 */
function key(): Buffer {
  const secret = env().APP_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("APP_ENCRYPTION_KEY(16자 이상)가 설정되지 않아 토큰을 안전하게 저장할 수 없습니다.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("암호화된 토큰 형식이 올바르지 않습니다.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
