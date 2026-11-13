export type NigerianArtMotif = "adire" | "benin" | "asooke";
export type NigerianArtIntensity = "subtle" | "vibrant" | "minimal";

export const ART_THEME_STORAGE_KEY_MOTIF = "nairabooks_art_motif";
export const ART_THEME_STORAGE_KEY_INTENSITY = "nairabooks_art_intensity";
export const ART_THEME_CHANGE_EVENT = "nairabooks-art-theme-change";

export interface NigerianArtThemeConfig {
  readonly motif: NigerianArtMotif;
  readonly intensity: NigerianArtIntensity;
}

export const ART_MOTIFS: readonly {
  readonly id: NigerianArtMotif;
  readonly name: string;
  readonly region: string;
  readonly description: string;
  readonly culturalSymbolism: string;
  readonly strokeColor: string;
}[] = [
  {
    id: "adire",
    name: "Adire Eleko",
    region: "Yoruba (Abeokuta / Ibadan)",
    description: "Sacred cassava resist indigo textile with Olokun abundance diamonds and Ese Agba chevrons.",
    culturalSymbolism: "Financial abundance, divine wisdom, and structured prosperity for Nigerian enterprises.",
    strokeColor: "#006838",
  },
  {
    id: "benin",
    name: "Benin Royal Bronze",
    region: "Edo (Kingdom of Benin)",
    description: "16th-century court metallurgy featuring the eternal sovereign guilloche braid and sun rosette.",
    culturalSymbolism: "Unbroken institutional integrity, royal prestige, and permanent accounting audit permanence.",
    strokeColor: "#8A5A2B",
  },
  {
    id: "asooke",
    name: "Igbo Uli & Aso-Oke",
    region: "Pan-Nigerian (Igbo & Yoruba)",
    description: "Curvilinear Uli life spirals (Agwolagwo) harmonized with handwoven Aso-Oke warp-and-weft lattice.",
    culturalSymbolism: "Continuous organic growth, renewal, and handcrafted entrepreneurial dedication.",
    strokeColor: "#006838",
  },
] as const;

export const ART_INTENSITIES: readonly {
  readonly id: NigerianArtIntensity;
  readonly label: string;
  readonly description: string;
  readonly opacityValue: number;
}[] = [
  {
    id: "subtle",
    label: "Subtle (Recommended)",
    description: "Refined cultural textile watermark; clearly visible with zero eye strain, optimal for daily bookkeeping.",
    opacityValue: 0.18,
  },
  {
    id: "vibrant",
    label: "Artistic & Vibrant",
    description: "Rich cultural presence with deeper textile linework and pronounced medallions.",
    opacityValue: 0.3,
  },
  {
    id: "minimal",
    label: "Minimalist Whisper",
    description: "Gentle heritage texture for high-density spreadsheet auditing.",
    opacityValue: 0.09,
  },
] as const;

export function getInitialArtTheme(): NigerianArtThemeConfig {
  if (typeof window === "undefined") {
    return { motif: "adire", intensity: "subtle" };
  }
  try {
    const savedMotif = localStorage.getItem(ART_THEME_STORAGE_KEY_MOTIF) as NigerianArtMotif | null;
    const savedIntensity = localStorage.getItem(ART_THEME_STORAGE_KEY_INTENSITY) as NigerianArtIntensity | null;
    const motif: NigerianArtMotif =
      savedMotif === "adire" || savedMotif === "benin" || savedMotif === "asooke"
        ? savedMotif
        : "adire";
    const intensity: NigerianArtIntensity =
      savedIntensity === "subtle" || savedIntensity === "vibrant" || savedIntensity === "minimal"
        ? savedIntensity
        : "subtle";
    return { motif, intensity };
  } catch {
    return { motif: "adire", intensity: "subtle" };
  }
}

export function saveArtTheme(config: Partial<NigerianArtThemeConfig>): NigerianArtThemeConfig {
  const current = getInitialArtTheme();
  const next: NigerianArtThemeConfig = {
    motif: config.motif ?? current.motif,
    intensity: config.intensity ?? current.intensity,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ART_THEME_STORAGE_KEY_MOTIF, next.motif);
      localStorage.setItem(ART_THEME_STORAGE_KEY_INTENSITY, next.intensity);
      window.dispatchEvent(new CustomEvent(ART_THEME_CHANGE_EVENT, { detail: next }));
    } catch {
      // Ignore localStorage write errors in private browsing
    }
  }
  return next;
}
