"use client";

import { useState } from "react";

import { AccountIdentitySection } from "@/components/settings/account-identity-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { ProfilePhotoSection } from "@/components/settings/profile-photo-section";
import { PublicProfileSection } from "@/components/settings/public-profile-section";
import type { SettingsPayload } from "@/lib/settings/get-settings";

type SettingsPageClientProps = {
  initialSettings: SettingsPayload;
  /** Wider content width inside admin console */
  variant?: "default" | "admin";
};

export function SettingsPageClient({
  initialSettings,
  variant = "default",
}: SettingsPageClientProps) {
  const [settings, setSettings] = useState(initialSettings);

  return (
    <div
      className={
        variant === "admin"
          ? "mx-auto flex w-full max-w-4xl flex-col gap-6"
          : "mx-auto flex max-w-3xl flex-col gap-6"
      }
    >
      <AccountIdentitySection identity={settings.identity} />

      <ProfilePhotoSection
        name={settings.identity.name}
        image={settings.image}
        onImageChange={(image) =>
          setSettings((prev) => ({ ...prev, image }))
        }
      />

      {settings.canEditPublicProfile && settings.publicProfile ? (
        <PublicProfileSection
          initialProfile={settings.publicProfile}
          onSaved={setSettings}
        />
      ) : null}

      <ChangePasswordSection email={settings.identity.email} />
    </div>
  );
}
