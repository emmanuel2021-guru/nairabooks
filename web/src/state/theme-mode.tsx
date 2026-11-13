"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";

interface ThemeModeContextValue {
  readonly theme: ThemeMode;
  readonly toggleTheme: () => void;
  readonly setTheme: (nextTheme: ThemeMode) => void;
}

const STORAGE_KEY = "nairabooks.theme";

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function ThemeModeProvider({
  children,
  defaultTheme = "light",
}: {
  readonly children: ReactNode;
  readonly defaultTheme?: ThemeMode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        applyThemeToDocument(saved);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial: ThemeMode = prefersDark ? "dark" : "light";
        setThemeState(initial);
        applyThemeToDocument(initial);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    applyThemeToDocument(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage restrictions
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeModeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

const DEFAULT_THEME_VALUE: ThemeModeContextValue = {
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
};

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    return DEFAULT_THEME_VALUE;
  }
  return ctx;
}
