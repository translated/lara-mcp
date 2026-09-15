import {
  ListResourcesResult,
  ListResourceTemplatesResult,
  ProtocolError,
  ProtocolErrorCode,
  ReadResourceRequest,
  ReadResourceResult,
  ResourceNotFoundError,
} from "@modelcontextprotocol/server";
import { getMemoryByName } from "./tools/get_memory_by_name.js";
import { listLanguages } from "./tools/list_languages.js";
import { listMemories } from "./tools/list_memories.js";
import { Translator } from "@translated/lara";
import { logger } from "#logger";

async function ListResourceTemplates(): Promise<ListResourceTemplatesResult> {
  return {
    resourceTemplates: [
      {
        name: "Get Memory by Name",
        uriTemplate: "memories://list/{name}",
        description: "Returns a memory by its name",
      },
    ],
  };
}

async function ListResources(): Promise<ListResourcesResult> {
  return {
    resources: [
      {
        name: "Translation Memories",
        description:
          "List of translation memories in your Lara Translate account.",
        uri: "memories://list",
      },
      {
        name: "Supported Languages",
        description: "List of Lara Translate supported languages.",
        uri: "languages://list",
      },
    ],
  };
}

async function ReadResource(
  request: ReadResourceRequest,
  lara: Translator
): Promise<ReadResourceResult> {
  const { uri } = request.params;

  logger.debug({ uri }, "Resource accessed");

  if (uri === "memories://list") {
    const memories = await listMemories(lara);
    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(memories, null, 2),
        },
      ],
    };
  }

  if (uri === "languages://list") {
    const languages = await listLanguages(lara);
    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(languages, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith("memories://list/")) {
    const name = uri.slice("memories://list/".length).trim();
    if (!name) {
      throw new ProtocolError(ProtocolErrorCode.InvalidParams, "Memory name is required.");
    }

    const memory = await getMemoryByName(lara, name);
    if (!memory) {
      throw new ResourceNotFoundError(uri, `Memory with name "${name}" not found.`);
    }

    return {
      contents: [
        {
          uri: uri,
          text: JSON.stringify(memory, null, 2),
        },
      ],
    };
  }

  logger.warn(`Requested a resource with uri ${uri}, but it was not found`);
  throw new ResourceNotFoundError(uri);
}

export { ListResourceTemplates, ListResources, ReadResource };
