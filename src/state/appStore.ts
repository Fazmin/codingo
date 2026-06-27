import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  getCachedSettings,
  loadSettings,
  saveSettings,
  type Settings,
} from "../lib/settings/store";

export type View = "author" | "learn" | "analyze" | "settings";

interface AppState {
  view: View;
  /** Set when navigating into Learn/Analyze for a specific campaign. */
  targetCampaignId: string | null;
  /** Set when opening a specific session in Analyze. */
  targetSessionId: string | null;
  settings: Settings;
  settingsLoaded: boolean;
  /** When true, navigation to Author/Analyze/Settings is blocked until unlocked. */
  locked: boolean;

  setView: (view: View) => void;
  goToLearn: (campaignId: string) => void;
  goToAnalyze: (campaignId: string, sessionId?: string) => void;
  setLocked: (locked: boolean) => void;
  initSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  replaceSettings: (next: Settings) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: "author",
  targetCampaignId: null,
  targetSessionId: null,
  settings: getCachedSettings() ?? DEFAULT_SETTINGS,
  settingsLoaded: false,
  locked: false,

  // While locked, the student stays in Learn mode; all other navigation is blocked.
  setView: (view) => {
    if (get().locked && view !== "learn") return;
    set({ view });
  },

  goToLearn: (campaignId) => set({ view: "learn", targetCampaignId: campaignId }),

  goToAnalyze: (campaignId, sessionId) => {
    if (get().locked) return;
    set({
      view: "analyze",
      targetCampaignId: campaignId,
      targetSessionId: sessionId ?? null,
    });
  },

  setLocked: (locked) => set({ locked }),

  initSettings: async () => {
    const settings = await loadSettings();
    set({ settings, settingsLoaded: true });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch } as Settings;
    set({ settings: next });
    await saveSettings(next);
  },

  replaceSettings: async (next) => {
    set({ settings: next });
    await saveSettings(next);
  },
}));
