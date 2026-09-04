import type { Translator } from "@translated/lara";
import { logger } from "#logger";

/**
 * The subset of the SDK's internal LaraClient this server depends on.
 * `Translator.client` is `protected` in the type declarations only; everything
 * below reaches it through the single cast in getLaraClient().
 */
export interface LaraClientShape {
  /**
   * The Lara access token the SDK holds: the result of its own /v2/auth
   * exchange of the access key. Populated lazily, on the first request.
   */
  token?: string;
  setExtraHeader?: (name: string, value: string) => void;
}

/**
 * Single guarded accessor for the Translator's internal LaraClient — the only
 * place that casts through `protected`. Callers check the specific capability
 * they need; this centralizes the cast and the "client itself is gone"
 * detection so an SDK change surfaces in one spot.
 */
export function getLaraClient(
  translator: Translator
): LaraClientShape | undefined {
  const client = (translator as unknown as { client?: unknown }).client;
  if (!client || typeof client !== "object") {
    logger.warn(
      "Translator.client is no longer accessible. Check for Lara SDK updates."
    );
    return undefined;
  }
  return client as LaraClientShape;
}
