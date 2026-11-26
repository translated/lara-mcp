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
  /**
   * The plan's enabled features: names joined by "," ("api_access,glossaries") from current
   * tokens, which carry an array; legacy tokens carry a bitmask ("1111101111111111111"), kept as is.
   */
  features?: string;
  /** `limits.glossaries_number`: 0 means the plan has no glossaries. Absent: unknown, Lara decides. */
  glossaries?: number;
};

const PLAN_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const FEATURES = /^[01]{1,64}$/;
const FEATURE_NAME = /^[a-z0-9_]{1,64}$/;
const COUNT = /^\d{1,9}$/;
// RegExp.test would read undefined as "undefined", a valid plan name.
const matches = (value: unknown, pattern: RegExp): value is string => typeof value === "string" && pattern.test(value);

// One odd name drops the whole list: a partial list would read as a plan without those features.
// An over-long list is dropped too, so the event stays under the metrics metadata cap.
function featuresOf(value: unknown): string | undefined {
  if (matches(value, FEATURES)) return value;
  if (!Array.isArray(value) || !value.every((name) => matches(name, FEATURE_NAME))) return undefined;
  const names = value.sort().join(",");
  return names.length <= 1024 ? names : undefined;
}

export function planFromToken(token: unknown): LaraPlan | undefined {
  const plan = tokenClaims(token)?.subscription?.plan;
  if (!plan || typeof plan !== "object") return undefined;
  const glossaries = String(plan.limits?.glossaries_number ?? "");
  const features = featuresOf(plan.features);
  return {
    ...(matches(plan.name, PLAN_NAME) && { name: plan.name }),
    ...(features !== undefined && { features }),
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
    // "" is a plan with no features, still worth reporting.
    ...(plan?.features !== undefined && { planFeatures: plan.features }),
    ...(plan?.glossaries !== undefined && { planGlossaries: plan.glossaries }),
  };
}

export function noGlossariesMessage(plan: LaraPlan | undefined): string {
  return `The connected Lara Translate account's plan${plan?.name ? ` ("${plan.name}")` : ""} does not include glossaries. ` +
    "Retrying will not help; translate works without glossaries, and the user can upgrade the plan at laratranslate.com.";
}
