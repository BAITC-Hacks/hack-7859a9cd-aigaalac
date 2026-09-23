"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);
export const THEME_STORAGE_KEY = "akim-theme";

// Runs before paint. Only a fixed theme enum is read; no stored text is rendered.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('akim-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme='light'}})()`;

export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode;
  forcedTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(forcedTheme ?? "light");
  useEffect(() => {
    // Temporary demo lock; stored preferences are preserved for later restoration.
    if (forcedTheme) {
      document.documentElement.dataset.theme = forcedTheme;
      setTheme(forcedTheme);
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        /* Storage can be disabled. */
      }
      const next =
        saved === "light" || saved === "dark"
          ? saved
          : media.matches
            ? "dark"
            : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    sync();
    media.addEventListener("change", sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [forcedTheme]);

  function toggleTheme() {
    if (forcedTheme) return;
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Theme still works in memory. */
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is required");
  return value;
}
