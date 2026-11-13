import React from "react";
import { TopNavCapsule } from "@/components/TopNavCapsule";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export const metadata = {
  title: "Settings — NairaBooks",
  description: "Company profile, statutory standards, file operations, and workspace preferences.",
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNavCapsule activeTab="overview" />
      <SettingsWorkspace />
    </div>
  );
}
