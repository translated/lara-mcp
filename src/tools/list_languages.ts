import { z } from "zod";
import { Translator } from "@translated/lara";

export const listLanguagesSchema = z.object({});

export async function listLanguages(lara: Translator) {
  return await lara.getLanguages();
}
