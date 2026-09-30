"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { authClient } from "@/lib/auth/client";
import { resolveUserImageUrl } from "@/lib/media/resolve-avatar-url";

const MAX_SETTINGS_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

type ProfilePhotoSectionProps = {
  name: string;
  image: string | null;
  onImageChange: (image: string | null) => void;
};

export function ProfilePhotoSection({
  name,
  image,
  onImageChange,
}: ProfilePhotoSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const resolved = resolveUserImageUrl(image);
  const hasCustomPhoto =
    Boolean(image) && !image?.includes("api.dicebear.com");

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
      // Allow empty type for HEIC on some browsers; server validates magic bytes
      const lower = file.name.toLowerCase();
      const looksHeic = lower.endsWith(".heic") || lower.endsWith(".heif");
      if (!looksHeic) {
        toast.error("Profile image must be JPG, PNG, WebP, HEIC, or HEIF.");
        return;
      }
    }

    if (file.size > MAX_SETTINGS_AVATAR_BYTES) {
      toast.error("Profile image must be under 5MB.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { image: string };
        error?: { message: string };
      };

      if (!response.ok || !data.success || !data.data?.image) {
        throw new Error(data.error?.message ?? "Failed to upload photo");
      }

      onImageChange(data.data.image);
      await authClient.getSession();
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);

    try {
      const response = await fetch("/api/settings/avatar", {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { image: string };
        error?: { message: string };
      };

      if (!response.ok || !data.success || !data.data?.image) {
        throw new Error(data.error?.message ?? "Failed to remove photo");
      }

      onImageChange(data.data.image);
      await authClient.getSession();
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove photo",
      );
      throw error;
    } finally {
      setRemoving(false);
    }
  }

  return (
    <SettingsSectionCard
      title="Profile Photo"
      description="Upload a clear photo of yourself. HEIC from iPhone is converted automatically."
      delay={0.1}
    >
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="relative">
          {resolved ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolved}
              alt={name}
              className="h-24 w-24 rounded-2xl border-2 border-slate-900 object-cover"
            />
          ) : (
            <UserAvatar name={name} image={image} size="lg" className="h-24 w-24 rounded-2xl" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || removing}
            className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Change photo"}
          </Button>

          {hasCustomPhoto ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRemoveOpen(true)}
              disabled={uploading || removing}
              className="border-slate-900"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleUpload(file);
        }}
      />

      <p className="mt-4 text-xs text-slate-500">
        JPG, PNG, WebP, or HEIC/HEIF up to 5MB.
      </p>

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Remove profile photo?"
        description="Your custom photo will be deleted and replaced with a default avatar."
        confirmLabel="Remove photo"
        variant="destructive"
        loading={removing}
        onConfirm={handleRemove}
      />
    </SettingsSectionCard>
  );
}
