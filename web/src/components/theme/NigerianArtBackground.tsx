"use client";

import React, { useEffect, useState } from "react";
import {
  ART_INTENSITIES,
  ART_MOTIFS,
  ART_THEME_CHANGE_EVENT,
  getInitialArtTheme,
  type NigerianArtThemeConfig,
} from "@/lib/art-theme";

export function NigerianArtBackground() {
  const [theme, setTheme] = useState<NigerianArtThemeConfig>({
    motif: "adire",
    intensity: "subtle",
  });
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getInitialArtTheme());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<NigerianArtThemeConfig>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener(ART_THEME_CHANGE_EVENT, handleThemeChange);
    return () => {
      window.removeEventListener(ART_THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  const activeMotifMeta =
    ART_MOTIFS.find((m) => m.id === theme.motif) ?? {
      id: "adire" as const,
      name: "Adire Eleko",
      region: "Yoruba",
      description: "",
      culturalSymbolism: "",
      strokeColor: "#006838",
    };
  const activeIntensityMeta =
    ART_INTENSITIES.find((i) => i.id === theme.intensity) ?? {
      id: "subtle" as const,
      label: "Subtle",
      description: "",
      opacityValue: 0.18,
    };

  const strokeColor = activeMotifMeta.strokeColor;
  const patternOpacity = activeIntensityMeta.opacityValue;
  const watermarkOpacity = activeIntensityMeta.opacityValue * 1.15;

  return (
    <div
      aria-hidden="true"
      data-testid="nigerian-art-canvas-background"
      data-art-motif={theme.motif}
      data-art-intensity={theme.intensity}
      className="nb-nigerian-art-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
      style={{
        backgroundColor: "var(--nb-art-bg-base, #F2F2F7)",
        backgroundImage: "var(--nb-art-gradient, radial-gradient(circle 800px at 50% -100px, rgba(230, 245, 237, 0.85) 0%, rgba(242, 242, 247, 0.4) 65%, #F2F2F7 100%))",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          color: strokeColor,
          opacity: mounted ? patternOpacity : 0.18,
          transition: "opacity 300ms ease, color 300ms ease",
        }}
      >
        <defs>
          {/* 1. Yoruba Adire Eleko Sacred Lattice Pattern */}
          <pattern
            id="nb-adire-eleko"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            {/* Outer perimeter grid border */}
            <rect
              x="0"
              y="0"
              width="80"
              height="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeDasharray="4 4"
            />
            {/* Diagonal guide rays */}
            <line
              x1="0"
              y1="0"
              x2="80"
              y2="80"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <line
              x1="80"
              y1="0"
              x2="0"
              y2="80"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            {/* Concentric Olokun Wealth Diamonds with delicate textural fills */}
            <polygon
              points="40,6 74,40 40,74 6,40"
              fill="currentColor"
              fillOpacity="0.05"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <polygon
              points="40,16 64,40 40,64 16,40"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <polygon
              points="40,26 54,40 40,54 26,40"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            {/* Star Cross of Cardinal Directions */}
            <line
              x1="40"
              y1="24"
              x2="40"
              y2="56"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <line
              x1="24"
              y1="40"
              x2="56"
              y2="40"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="40" cy="40" r="3.5" fill="currentColor" />
            <circle cx="40" cy="40" r="6" fill="none" stroke="currentColor" strokeWidth="0.8" />
            {/* Corner Chevrons (Ese Agba - Footsteps of Wisdom) */}
            <polyline
              points="0,18 18,0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="0,28 28,0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="80,18 62,0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="80,28 52,0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="0,62 18,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="0,52 28,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="80,62 62,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <polyline
              points="80,52 52,80"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            {/* Cowrie Currency Symbols at Midpoints (Owo Ero - Financial Abundance) */}
            <path
              d="M33,5 C33,1 47,1 47,5 C47,9 33,9 33,5 Z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="36"
              y1="5"
              x2="44"
              y2="5"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <path
              d="M33,75 C33,71 47,71 47,75 C47,79 33,79 33,75 Z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="36"
              y1="75"
              x2="44"
              y2="75"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <path
              d="M5,33 C1,33 1,47 5,47 C9,47 9,33 5,33 Z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="5"
              y1="36"
              x2="5"
              y2="44"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <path
              d="M75,33 C71,33 71,47 75,47 C79,47 79,33 75,33 Z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="75"
              y1="36"
              x2="75"
              y2="44"
              stroke="currentColor"
              strokeWidth="0.9"
            />
          </pattern>

          {/* 2. Benin Royal Court Guilloche & Bronze Rosette Pattern */}
          <pattern
            id="nb-benin-bronze"
            width="96"
            height="96"
            patternUnits="userSpaceOnUse"
          >
            {/* Horizontal Interlocking Sinusoidal Guilloche Braids */}
            <path
              d="M0,48 C24,24 24,72 48,48 C72,24 72,72 96,48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M0,48 C24,72 24,24 48,48 C72,72 72,24 96,48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            {/* Vertical Interlocking Guilloche Braids */}
            <path
              d="M48,0 C24,24 72,24 48,48 C24,72 72,72 48,96"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M48,0 C72,24 24,24 48,48 C72,72 24,72 48,96"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            {/* Central 16th-Century Benin Court Rosette */}
            <circle
              cx="48"
              cy="48"
              r="18"
              fill="currentColor"
              fillOpacity="0.06"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <circle
              cx="48"
              cy="48"
              r="9"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="48" cy="48" r="3.5" fill="currentColor" />
            {/* 4 Sacred Court Petals */}
            <path
              d="M48,30 C43,30 40,35 40,40 C40,45 43,48 48,48 C53,48 56,45 56,40 C56,35 53,30 48,30 Z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="M48,66 C43,66 40,61 40,56 C40,51 43,48 48,48 C53,48 56,51 56,56 C56,61 53,66 48,66 Z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="M30,48 C30,43 35,40 40,40 C45,40 48,43 48,48 C48,53 45,56 40,56 C35,56 30,53 30,48 Z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path
              d="M66,48 C66,43 61,40 56,40 C51,40 48,43 48,48 C48,53 51,56 56,56 C61,56 66,53 66,48 Z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            {/* Corner Medallion Junctions */}
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              cx="96"
              cy="0"
              r="12"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              cx="0"
              cy="96"
              r="12"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              cx="96"
              cy="96"
              r="12"
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </pattern>

          {/* 3. Igbo Uli & Yoruba Aso-Oke Handloom Weave Pattern */}
          <pattern
            id="nb-asooke-uli"
            width="72"
            height="72"
            patternUnits="userSpaceOnUse"
          >
            {/* Aso-Oke Handloom Warp & Weft Structural Loom Grid */}
            <line
              x1="12"
              y1="0"
              x2="12"
              y2="72"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="24"
              y1="0"
              x2="24"
              y2="72"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="48"
              y1="0"
              x2="48"
              y2="72"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="60"
              y1="0"
              x2="60"
              y2="72"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="0"
              y1="12"
              x2="72"
              y2="12"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="0"
              y1="24"
              x2="72"
              y2="24"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="0"
              y1="48"
              x2="72"
              y2="48"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <line
              x1="0"
              y1="60"
              x2="72"
              y2="60"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            {/* Igbo Uli Curvilinear Spiral (Agwolagwo - Continuous Life & Growth) */}
            <circle
              cx="36"
              cy="36"
              r="16"
              fill="currentColor"
              fillOpacity="0.06"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle
              cx="36"
              cy="36"
              r="9"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <circle cx="36" cy="36" r="3" fill="currentColor" />
            {/* Traditional Uli Crescent Moons (Onwa) */}
            <path
              d="M12,12 C18,6 26,6 32,12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M40,60 C46,66 54,66 60,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M60,12 C66,18 66,26 60,32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M12,40 C6,46 6,54 12,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>

        {/* Dynamic Pattern Rect Fill based on active user motif */}
        <rect
          width="100%"
          height="100%"
          fill={
            theme.motif === "benin"
              ? "url(#nb-benin-bronze)"
              : theme.motif === "asooke"
                ? "url(#nb-asooke-uli)"
                : "url(#nb-adire-eleko)"
          }
        />
      </svg>

      {/* Top-Right Ambient Cultural Watermark Crest (Nigerian Royal Sunburst) */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 sm:h-[440px] sm:w-[440px] select-none nb-animate-spin-slow"
        style={{
          color: strokeColor,
          opacity: mounted ? watermarkOpacity : 0.18,
          transition: "opacity 300ms ease, color 300ms ease",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Sunburst Ray Ring */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="4 4"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="currentColor"
            fillOpacity="0.05"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="100"
            r="64"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
          <circle
            cx="100"
            cy="100"
            r="44"
            fill="currentColor"
            fillOpacity="0.08"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          {/* 12 Radiating Sun/Bronze Flutes */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(
            (deg) => (
              <line
                key={deg}
                x1="100"
                y1="100"
                x2="100"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.6"
                transform={`rotate(${deg} 100 100)`}
              />
            ),
          )}
          {/* Core Nigerian Wealth Symbol (Central 4-Lobed Diamond & Star) */}
          <polygon
            points="100,56 144,100 100,144 56,100"
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <circle cx="100" cy="100" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="5" fill="currentColor" />
        </svg>
      </div>

      {/* Bottom-Left Ambient Cultural Watermark Crest (Benin & Uli Integrity Seal) */}
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 sm:h-[400px] sm:w-[400px] select-none nb-animate-pulse-slow"
        style={{
          color: strokeColor,
          opacity: mounted ? watermarkOpacity : 0.18,
          transition: "opacity 300ms ease, color 300ms ease",
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Concentric Guilloche Boundary */}
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="currentColor"
            fillOpacity="0.05"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="100"
            r="76"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Intersecting Square Lozenges (Traditional Arewa & Court Symmetry) */}
          <rect
            x="40"
            y="40"
            width="120"
            height="120"
            fill="currentColor"
            fillOpacity="0.07"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <rect
            x="40"
            y="40"
            width="120"
            height="120"
            fill="currentColor"
            fillOpacity="0.07"
            stroke="currentColor"
            strokeWidth="1.6"
            transform="rotate(45 100 100)"
          />
          <circle cx="100" cy="100" r="30" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
