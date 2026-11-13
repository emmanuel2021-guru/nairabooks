import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import axe from "axe-core";
import { NigerianArtBackground } from "@/components/theme/NigerianArtBackground";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { FileSettingsModal } from "@/components/settings/FileSettingsModal";
import { WorkspaceModeProvider } from "@/state/workspace-mode";
import {
  ART_INTENSITIES,
  ART_MOTIFS,
  getInitialArtTheme,
  saveArtTheme,
} from "@/lib/art-theme";

describe("Nigerian Cultural Artwork Theme & Canvas (`ui-ux-designer`, `tailwind-design-system`)", () => {
  it("renders NigerianArtBackground with aria-hidden, pointer-events-none, and SVG pattern definitions", () => {
    const { container } = render(<NigerianArtBackground />);
    const canvas = screen.getByTestId("nigerian-art-canvas-background");
    expect(canvas).toBeDefined();
    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    expect(canvas.className).toContain("pointer-events-none");
    expect(canvas.className).toContain("fixed");
    expect(canvas.className).toContain("-z-10");

    // Verify SVG pattern defs exist
    const adirePattern = container.querySelector("#nb-adire-eleko");
    const beninPattern = container.querySelector("#nb-benin-bronze");
    const asookePattern = container.querySelector("#nb-asooke-uli");
    expect(adirePattern).not.toBeNull();
    expect(beninPattern).not.toBeNull();
    expect(asookePattern).not.toBeNull();
  });

  it("updates art theme via saveArtTheme and dispatches custom event", () => {
    const updated = saveArtTheme({ motif: "benin", intensity: "vibrant" });
    expect(updated.motif).toBe("benin");
    expect(updated.intensity).toBe("vibrant");

    const read = getInitialArtTheme();
    expect(read.motif).toBe("benin");
    expect(read.intensity).toBe("vibrant");

    // Reset back to adire subtle
    saveArtTheme({ motif: "adire", intensity: "subtle" });
    expect(getInitialArtTheme().motif).toBe("adire");
  });

  it("renders Nigerian Cultural Artwork section in SettingsWorkspace with zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <SettingsWorkspace />
      </WorkspaceModeProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Nigerian Cultural Artwork Theme", level: 2 })
    ).toBeDefined();

    // Verify all 3 motif buttons exist
    for (const motif of ART_MOTIFS) {
      const btn = screen.getByRole("button", { name: new RegExp(motif.name, "i") });
      expect(btn).toBeDefined();
    }

    // Verify all 3 intensity buttons exist
    for (const intensity of ART_INTENSITIES) {
      const label = intensity.label.split(" ")[0] ?? "Subtle";
      const btn = screen.getByRole("button", { name: new RegExp(label, "i") });
      expect(btn).toBeDefined();
    }

    // Switch to Benin Royal Bronze
    const beninBtn = screen.getByRole("button", { name: /Benin Royal Bronze/i });
    fireEvent.click(beninBtn);
    expect(beninBtn.getAttribute("aria-pressed")).toBe("true");

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it("renders Nigerian Cultural Artwork section in FileSettingsModal Preferences tab with zero axe violations", async () => {
    const { container } = render(
      <WorkspaceModeProvider>
        <FileSettingsModal isOpen={true} onClose={() => {}} />
      </WorkspaceModeProvider>
    );

    // Switch to App Preferences tab
    const prefsTab = screen.getByRole("button", { name: /App Preferences/i });
    fireEvent.click(prefsTab);

    expect(screen.getByText("Nigerian Cultural Artwork Theme")).toBeDefined();
    expect(screen.getByText("Authentic heritage textile & bronze watermark on app background")).toBeDefined();

    const adireBtn = screen.getByRole("button", { name: /Adire Eleko/i });
    expect(adireBtn).toBeDefined();

    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
