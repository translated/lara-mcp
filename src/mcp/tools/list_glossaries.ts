import { z } from "zod/v4";
import { Translator } from "@translated/lara";
import { errorTypeFor } from "../../metrics.js";
import { noGlossariesMessage, planOf } from "../lara-plan.js";
import { glossarySchema } from "./_schemas.js";

export const listGlossariesSchema = z.object({});

export const listGlossariesOutputSchema = z.object({
  items: z
    .array(glossarySchema)
    .describe("Glossaries accessible to the authenticated account"),
  unavailable: z
    .string()
    .optional()
    .describe("Present when the account's plan does not include glossaries: why the list is empty"),
});

/**
 * A plan without glossaries answers an empty list that says why, not an error: models call this to
 * explore the account, and a 403 there reads as a failure (and gets retried) when nothing is wrong.
 */
export async function listGlossaries(lara: Translator) {
  try {
    return await lara.glossaries.list();
  } catch (error) {
    if (errorTypeFor(error) !== "forbidden_403") throw error;
    return { items: [], unavailable: noGlossariesMessage(planOf(lara)) };
  }
}
