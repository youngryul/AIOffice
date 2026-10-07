import type { Json } from "./database.types";

export type JsonValue = NonNullable<Json>;

/** 구조화된 값을 jsonb 컬럼에 저장하기 위한 변환 (not null jsonb 컬럼 타입 대응) */
export function toJson(value: unknown): JsonValue {
  return (value ?? {}) as JsonValue;
}
