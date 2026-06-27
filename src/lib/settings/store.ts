import { isTauri } from "../utils";

export type AIProvider = "openai" | "anthropic";

export interface ModelSettings {
  provider: AIProvider;
  chatModel: string;
  transcriptionModel: string;
  speechModel: string;
  speechVoice: string;
  openaiKey: string;
  anthropicKey: string;
}

export type ThemeMode = "light" | "dark" | "system";

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentName;
  fontScale: number;
  reduceMotion: boolean;
  syncEditorTheme: boolean;
}

export interface Settings {
  model: ModelSettings;
  appearance: AppearanceSettings;
  studentId: string;
  /** 4-digit code that unlocks a "Lock & Run" session. Empty = not configured. */
  lockPin: string;
}

export type AccentName =
  | "indigo"
  | "violet"
  | "teal"
  | "emerald"
  | "rose"
  | "amber"
  | "sky";

export const ACCENTS: Record<AccentName, { light: string; dark: string; label: string }> = {
  indigo: { light: "243 75% 59%", dark: "243 80% 67%", label: "Indigo" },
  violet: { light: "262 83% 58%", dark: "263 85% 70%", label: "Violet" },
  teal: { light: "173 80% 36%", dark: "172 66% 50%", label: "Teal" },
  emerald: { light: "160 84% 39%", dark: "158 64% 52%", label: "Emerald" },
  rose: { light: "347 77% 50%", dark: "347 85% 66%", label: "Rose" },
  amber: { light: "32 95% 44%", dark: "38 92% 58%", label: "Amber" },
  sky: { light: "200 98% 39%", dark: "199 89% 58%", label: "Sky" },
};

export const DEFAULT_SETTINGS: Settings = {
  model: {
    provider: "openai",
    chatModel: "gpt-4o",
    transcriptionModel: "whisper-1",
    speechModel: "tts-1",
    speechVoice: "alloy",
    openaiKey: "",
    anthropicKey: "",
  },
  appearance: {
    theme: "system",
    accent: "indigo",
    fontScale: 1,
    reduceMotion: false,
    syncEditorTheme: true,
  },
  studentId: "student-1",
  lockPin: "",
};

const STORE_FILE = "settings.json";
const STORE_KEY = "settings";
const LS_KEY = "socratic.settings";

function deepMerge<T>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const ov = override[key];
    const bv = (base as any)[key];
    if (ov && typeof ov === "object" && !Array.isArray(ov) && bv && typeof bv === "object") {
      out[key] = deepMerge(bv, ov as any);
    } else if (ov !== undefined) {
      out[key] = ov;
    }
  }
  return out;
}

let cache: Settings | null = null;

async function getTauriStore() {
  const { load } = await import("@tauri-apps/plugin-store");
  return load(STORE_FILE);
}

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    if (isTauri()) {
      const store = await getTauriStore();
      const saved = (await store.get<Partial<Settings>>(STORE_KEY)) ?? undefined;
      cache = deepMerge(DEFAULT_SETTINGS, saved);
    } else {
      const raw = localStorage.getItem(LS_KEY);
      cache = deepMerge(DEFAULT_SETTINGS, raw ? JSON.parse(raw) : undefined);
    }
  } catch (e) {
    console.warn("Failed to load settings, using defaults", e);
    cache = DEFAULT_SETTINGS;
  }
  // Mirror appearance to localStorage for synchronous first-paint theming.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  return cache;
}

export async function saveSettings(next: Settings): Promise<void> {
  cache = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  if (isTauri()) {
    try {
      const store = await getTauriStore();
      await store.set(STORE_KEY, next);
      await store.save();
    } catch (e) {
      console.warn("Failed to persist settings to disk store", e);
    }
  }
}

export function getCachedSettings(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    cache = deepMerge(DEFAULT_SETTINGS, raw ? JSON.parse(raw) : undefined);
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache;
}
