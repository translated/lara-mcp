import {Translator} from "@translated/lara";
import {listMemories} from "./list_memories.js";

export async function getMemoryByName(lara: Translator, name: string): Promise<any> {
    const memories = await listMemories(lara);
    return memories.find(m => m.name === name);
}