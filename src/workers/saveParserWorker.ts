/**
 * Web Worker for save game parsing — runs decompression and extraction off the main thread.
 * Receives an ArrayBuffer (Transferable, zero-copy), returns ParsedSaveData.
 * Includes: research queue parsing for in-progress techs.
 */
import * as Comlink from "comlink";
import { parseSaveFile } from "../engine/saveParser";
import type { ParsedSaveData } from "../types/saveGame";

const api = {
  parse(buffer: ArrayBuffer): ParsedSaveData {
    return parseSaveFile(buffer);
  },
};

export type SaveParserWorkerApi = typeof api;

Comlink.expose(api);
