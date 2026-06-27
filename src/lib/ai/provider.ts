import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { isTauri } from "../utils";
import { getCachedSettings, type Settings } from "../settings/store";

/**
 * Production Tauri webviews serve from tauri://localhost and get CORS-blocked
 * when hitting OpenAI/Anthropic directly. tauri-plugin-http routes the request
 * through Rust, bypassing the webview's CORS enforcement. In a plain browser
 * (`npm run dev`) we fall back to native fetch + the Vite dev proxy.
 */
let tauriFetch: typeof globalThis.fetch | null = null;

async function corsSafeFetch(): Promise<typeof globalThis.fetch> {
  if (!isTauri()) return globalThis.fetch.bind(globalThis);
  if (tauriFetch) return tauriFetch;
  const mod = await import("@tauri-apps/plugin-http");
  tauriFetch = mod.fetch as unknown as typeof globalThis.fetch;
  return tauriFetch;
}

function openaiBaseUrl(): string | undefined {
  return isTauri() ? undefined : `${location.origin}/proxy/openai/v1`;
}

function anthropicBaseUrl(): string | undefined {
  return isTauri() ? undefined : `${location.origin}/proxy/anthropic/v1`;
}

export class MissingKeyError extends Error {}

export async function getOpenAI(settings?: Settings): Promise<OpenAIProvider> {
  const s = settings ?? getCachedSettings();
  if (!s.model.openaiKey) {
    throw new MissingKeyError(
      "No OpenAI API key set. Add one in Settings -> Models & API Keys.",
    );
  }
  const fetchImpl = await corsSafeFetch();
  return createOpenAI({
    apiKey: s.model.openaiKey,
    baseURL: openaiBaseUrl(),
    fetch: fetchImpl,
  });
}

async function getAnthropic(settings?: Settings) {
  const s = settings ?? getCachedSettings();
  if (!s.model.anthropicKey) {
    throw new MissingKeyError(
      "No Anthropic API key set. Add one in Settings -> Models & API Keys.",
    );
  }
  const fetchImpl = await corsSafeFetch();
  return createAnthropic({
    apiKey: s.model.anthropicKey,
    baseURL: anthropicBaseUrl(),
    fetch: fetchImpl,
    headers: { "anthropic-dangerous-direct-browser-access": "true" },
  });
}

/** The chat model used by the Socratic agent and the analysis pass. */
export async function getChatModel(settings?: Settings): Promise<LanguageModel> {
  const s = settings ?? getCachedSettings();
  if (s.model.provider === "anthropic") {
    const anthropic = await getAnthropic(s);
    return anthropic(s.model.chatModel);
  }
  const openai = await getOpenAI(s);
  return openai(s.model.chatModel);
}

/** Quick connectivity / key validation used by the Settings "Test" buttons. */
export async function testProvider(
  provider: "openai" | "anthropic",
  settings: Settings,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { generateText } = await import("ai");
    const model =
      provider === "anthropic"
        ? (await getAnthropic(settings))(settings.model.chatModel)
        : (await getOpenAI(settings))(settings.model.chatModel);
    const res = await generateText({
      model,
      prompt: 'Reply with the single word "ok".',
      maxOutputTokens: 64,
    });
    return {
      ok: true,
      message: `Connected. Model replied: "${res.text.trim().slice(0, 40)}"`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
