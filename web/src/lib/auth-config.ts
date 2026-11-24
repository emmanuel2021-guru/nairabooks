import { randomBytes } from "node:crypto";

/** Built-in demo password, used only outside production when no override is configured. */
const DEV_DEMO_PASSWORD = "NairaBooks#2026";
const MIN_SECRET_LENGTH = 32;

export interface AuthRuntimeConfig {
  readonly isProduction: boolean;
  /** HMAC key for session tokens. `null` in production when missing or too short (fail closed). */
  readonly sessionSecret: string | null;
  /** Password for the seeded demo accounts. `null` means no demo accounts exist. */
  readonly demoPassword: string | null;
  /** Whether cookie-less requests may act as the demo owner (local dev and tests only). */
  readonly allowAnonymousDemoContext: boolean;
}

type EnvLike = Readonly<Record<string, string | undefined>>;

export function resolveAuthRuntimeConfig(env: EnvLike = process.env): AuthRuntimeConfig {
  const isProduction = env.NODE_ENV === "production";

  const configuredSecret = env.NAIRABOOKS_SESSION_SECRET?.trim() ?? "";
  const sessionSecret =
    configuredSecret.length >= MIN_SECRET_LENGTH
      ? configuredSecret
      : isProduction
        ? null
        : randomBytes(32).toString("hex");

  const configuredDemo = env.NAIRABOOKS_DEMO_PASSWORD?.trim() ?? "";
  const demoPassword = configuredDemo || (isProduction ? null : DEV_DEMO_PASSWORD);

  return {
    isProduction,
    sessionSecret,
    demoPassword,
    allowAnonymousDemoContext: !isProduction && demoPassword !== null,
  };
}
