"use client";

import { Camera, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { validateAvatarFile } from "@/lib/auth/avatar-client";
import { cn } from "@/lib/utils";

type AvatarUploadFieldProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function AvatarUploadField({
  file,
  onChange,
  disabled = false,
}: AvatarUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) return;

    const validation = validateAvatarFile(selectedFile);

    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    clearPreview();
    const objectUrl = URL.createObjectURL(selectedFile);
    previewRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    onChange(selectedFile);
  }

  function handleRemove() {
    clearPreview();
    onChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            "group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-sky-400 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70",
            previewUrl && "border-solid border-slate-900",
          )}
          aria-label="Choose profile photo"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Profile preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-slate-300" />
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </span>
        </button>

        {file ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full border-2 border-slate-900 bg-white shadow-inkcuba"
            aria-label="Remove profile photo"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="text-center">
        <p className="text-xs text-slate-500">
          Optional — JPG, PNG, or WebP up to 2MB
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {file
            ? "Photo selected — it will be saved when you create your account"
            : "Skip this step and a unique default avatar will be generated"}
        </p>
      </div>
    </div>
  );
}
