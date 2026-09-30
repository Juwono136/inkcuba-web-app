"use client";

import { useState } from "react";

import { AccountIdentitySection } from "@/components/settings/account-identity-section";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { LoginHistorySection } from "@/components/settings/login-history-section";
import { ProfilePhotoSection } from "@/components/settings/profile-photo-section";
import { PublicProfileSection } from "@/components/settings/public-profile-section";
import type { SettingsPayload } from "@/lib/settings/get-settings";
import { cn } from "@/lib/utils";

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
      className={cn(
        "mx-auto flex w-full flex-col gap-6",
        variant === "admin" ? "max-w-6xl" : "max-w-6xl",
      )}
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          <AccountIdentitySection identity={settings.identity} />
        </div>
        <div className="min-w-0">
          <ProfilePhotoSection
            name={settings.identity.name}
            image={settings.image}
            onImageChange={(image) =>
              setSettings((prev) => ({ ...prev, image }))
            }
          />
        </div>
      </div>

      {settings.canEditPublicProfile && settings.publicProfile ? (
        <div className="min-w-0">
          <PublicProfileSection
            initialProfile={settings.publicProfile}
            onSaved={setSettings}
          />
        </div>
      ) : null}

      {/* Security + Login History side-by-side on large screens (avoids endless scroll) */}
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0">
          <ChangePasswordSection email={settings.identity.email} />
        </div>
        <div className="min-w-0">
          <LoginHistorySection />
        </div>
      </div>
    </div>
  );
}
