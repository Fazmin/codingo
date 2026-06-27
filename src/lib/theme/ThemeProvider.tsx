import { useEffect } from "react";
import { ACCENTS } from "../settings/store";
import { useAppStore } from "../../state/appStore";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

export function resolveDark(theme: string): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemPrefersDark();
}

/** Applies appearance settings (theme, accent, font scale, motion) to <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useAppStore((s) => s.settings.appearance);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = resolveDark(appearance.theme);
      root.classList.toggle("dark", dark);
      const accent = ACCENTS[appearance.accent] ?? ACCENTS.indigo;
      root.style.setProperty("--accent", dark ? accent.dark : accent.light);
      root.style.fontSize = `${Math.round(16 * appearance.fontScale)}px`;
      root.classList.toggle("reduce-motion", appearance.reduceMotion);
    };
    apply();

    if (appearance.theme === "system" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [appearance.theme, appearance.accent, appearance.fontScale, appearance.reduceMotion]);

  return <>{children}</>;
}
