"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { authClient } from "@/lib/auth/client";
import { notifySessionUserUpdated } from "@/lib/auth/session-user-sync";
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

async function refreshSessionAfterAvatarChange() {
  // Bypass Better Auth cookie cache so navbar/menus get the new image ASAP.
  await authClient.getSession({
    query: { disableCookieCache: true },
  });
}

export function ProfilePhotoSection({
  name,
  image,
  onImageChange,
}: ProfilePhotoSectionProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);

  const resolved = resolveUserImageUrl(image);
  const hasCustomPhoto =
    Boolean(image) && !image?.includes("api.dicebear.com");

  async function syncAvatarEverywhere(nextImage: string) {
    onImageChange(nextImage);
    notifySessionUserUpdated({ image: nextImage });
    await refreshSessionAfterAvatarChange();
    router.refresh();
  }

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
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

      await syncAvatarEverywhere(data.data.image);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
      throw error;
    } finally {
      setUploading(false);
      pendingFileRef.current = null;
    }
  }

  function onFileSelected(file: File) {
    if (hasCustomPhoto) {
      pendingFileRef.current = file;
      setConfirmReplaceOpen(true);
      return;
    }

    void handleUpload(file);
  }

  async function confirmReplace() {
    const file = pendingFileRef.current;
    if (!file) return;
    await handleUpload(file);
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

      await syncAvatarEverywhere(data.data.image);
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
              key={resolved}
              src={resolved}
              alt={name}
              className="h-24 w-24 rounded-2xl border-2 border-slate-900 object-cover"
            />
          ) : (
            <UserAvatar
              name={name}
              image={image}
              size="lg"
              className="h-24 w-24 rounded-2xl"
            />
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
          if (file) onFileSelected(file);
        }}
      />

      <p className="mt-4 text-xs text-slate-500">
        JPG, PNG, WebP, or HEIC/HEIF up to 5MB. Replacing a photo deletes the
        previous file from storage.
      </p>

      <ConfirmDialog
        open={confirmReplaceOpen}
        onOpenChange={(open) => {
          setConfirmReplaceOpen(open);
          if (!open) pendingFileRef.current = null;
        }}
        title="Replace profile photo?"
        description="Your current photo will be permanently deleted from storage and replaced with the new image."
        confirmLabel="Replace photo"
        loading={uploading}
        onConfirm={confirmReplace}
      />

      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Remove profile photo?"
        description="Your custom photo will be deleted from storage and replaced with a default avatar."
        confirmLabel="Remove photo"
        variant="destructive"
        loading={removing}
        onConfirm={handleRemove}
      />
    </SettingsSectionCard>
  );
}
