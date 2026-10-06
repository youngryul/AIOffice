export class BudgetExceededError extends Error {
  constructor(
    message: string,
    readonly scope: "employee" | "company",
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY 가 설정되지 않았습니다. .env.local 에 OPENAI_API_KEY 를 추가하세요.");
    this.name = "AiNotConfiguredError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 1000);
  return String(err).slice(0, 1000);
}
