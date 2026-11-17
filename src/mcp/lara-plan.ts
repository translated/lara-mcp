import type { Translator } from "@translated/lara";
import { getLaraClient, tokenClaims } from "../lara-client.js";

/**
 * The plan facts a Lara access token carries (`subscription.plan`). The JWT signature is never
 * checked here, so these are UX hints only: they word errors, and Lara still enforces the plan on
 * every request. Each value is validated before it can reach the metrics backend, which rejects a
 * whole batch over one odd field.
 */
export type LaraPlan = {
  name?: string;
  /** Lara's feature bitmask ("1111101111111111111"); which bit is which is not documented yet. */
  features?: string;
  /** `limits.glossaries_number`: 0 means the plan has no glossaries. Absent: unknown, Lara decides. */
  glossaries?: number;
};

const PLAN_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const FEATURES = /^[01]{1,64}$/;
const COUNT = /^\d{1,9}$/;
// RegExp.test would read undefined as "undefined", a valid plan name.
const matches = (value: unknown, pattern: RegExp): value is string => typeof value === "string" && pattern.test(value);

export function planFromToken(token: unknown): LaraPlan | undefined {
  const plan = tokenClaims(token)?.subscription?.plan;
  if (!plan || typeof plan !== "object") return undefined;
  const glossaries = String(plan.limits?.glossaries_number ?? "");
  return {
    ...(matches(plan.name, PLAN_NAME) && { name: plan.name }),
    ...(matches(plan.features, FEATURES) && { features: plan.features }),
    ...(COUNT.test(glossaries) && { glossaries: Number(glossaries) }),
  };
}

/**
 * The plan of the token the Translator holds. The SDK exchanges the access key for a token on the
 * first request, so there is none before it: read it after a call, never to skip one.
 */
export const planOf = (lara: Translator): LaraPlan | undefined => planFromToken(getLaraClient(lara)?.token);

/** The plan as metrics metadata, under names that cannot clash with a call's own fields. */
export function planMetadata(plan: LaraPlan | undefined): Record<string, unknown> {
  return {
    ...(plan?.name && { planName: plan.name }),
    ...(plan?.features && { planFeatures: plan.features }),
    ...(plan?.glossaries !== undefined && { planGlossaries: plan.glossaries }),
  };
}

export function noGlossariesMessage(plan: LaraPlan | undefined): string {
  return `The connected Lara Translate account's plan${plan?.name ? ` ("${plan.name}")` : ""} does not include glossaries. ` +
    "Retrying will not help; translate works without glossaries, and the user can upgrade the plan at laratranslate.com.";
}
