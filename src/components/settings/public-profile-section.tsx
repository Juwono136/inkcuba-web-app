"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/settings/rich-text-editor";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { SocialLinksPreview } from "@/components/settings/social-links-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SettingsPayload,
  SettingsPublicProfile,
} from "@/lib/settings/get-settings";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import { publicProfileSchema } from "@/lib/validators/settings";

type PublicProfileSectionProps = {
  initialProfile: SettingsPublicProfile;
  onSaved: (settings: SettingsPayload) => void;
};

export function PublicProfileSection({
  initialProfile,
  onSaved,
}: PublicProfileSectionProps) {
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [skills, setSkills] = useState<string[]>(initialProfile.skills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(initialProfile.githubUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(
    initialProfile.instagramUrl ?? "",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(initialProfile.youtubeUrl ?? "");
  const [twitterUrl, setTwitterUrl] = useState(initialProfile.twitterUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(initialProfile.tiktokUrl ?? "");
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(
    initialProfile.portfolioUrls?.length
      ? [...initialProfile.portfolioUrls]
      : [""],
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bioLength = plainTextFromHtml(bio).length;

  function addSkill() {
    const next = skillDraft.trim();
    if (!next) return;

    if (skills.length >= 10) {
      toast.error("You can add at most 10 skills");
      return;
    }

    if (skills.some((skill) => skill.toLowerCase() === next.toLowerCase())) {
      toast.error("Skill already added");
      return;
    }

    setSkills((prev) => [...prev, next]);
    setSkillDraft("");
  }

  async function handleSave() {
    setErrors({});

    const payload = {
      bio,
      skills,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: githubUrl || undefined,
      instagramUrl: instagramUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      twitterUrl: twitterUrl || undefined,
      tiktokUrl: tiktokUrl || undefined,
      portfolioUrls: portfolioUrls.map((url) => url.trim()).filter(Boolean),
    };

    const parsed = publicProfileSchema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the form errors");
      return;
    }

    if (bioLength > 2000) {
      setErrors({ bio: "Bio must be at most 2000 characters" });
      toast.error("Bio must be at most 2000 characters");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: SettingsPayload;
        error?: { message: string };
      };

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to save profile");
      }

      onSaved(data.data);
      toast.success("Public profile saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSectionCard
      title="Public Profile"
      description="This information can appear on your public exhibition profile."
      delay={0.15}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Bio</Label>
            <span
              className={
                bioLength > 2000 ? "text-xs text-red-500" : "text-xs text-slate-500"
              }
            >
              {bioLength}/2000
            </span>
          </div>
          <RichTextEditor value={bio} onChange={setBio} disabled={saving} />
          {errors.bio ? (
            <p className="text-xs text-red-500">{errors.bio}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Skills</Label>
          <div className="flex gap-2">
            <Input
              value={skillDraft}
              onChange={(event) => setSkillDraft(event.target.value)}
              placeholder="e.g. React"
              disabled={saving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addSkill}
              disabled={saving}
              className="border-slate-900"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() =>
                    setSkills((prev) => prev.filter((item) => item !== skill))
                  }
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  {skill}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
          {errors.skills ? (
            <p className="text-xs text-red-500">{errors.skills}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <UrlField
            label="LinkedIn"
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            error={errors.linkedinUrl}
            disabled={saving}
            placeholder="https://linkedin.com/in/..."
          />
          <UrlField
            label="GitHub"
            value={githubUrl}
            onChange={setGithubUrl}
            error={errors.githubUrl}
            disabled={saving}
            placeholder="https://github.com/..."
          />
          <UrlField
            label="Instagram"
            value={instagramUrl}
            onChange={setInstagramUrl}
            error={errors.instagramUrl}
            disabled={saving}
            placeholder="https://instagram.com/..."
          />
          <UrlField
            label="YouTube"
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            error={errors.youtubeUrl}
            disabled={saving}
            placeholder="https://youtube.com/..."
          />
          <UrlField
            label="X (Twitter)"
            value={twitterUrl}
            onChange={setTwitterUrl}
            error={errors.twitterUrl}
            disabled={saving}
            placeholder="https://x.com/..."
          />
          <UrlField
            label="TikTok"
            value={tiktokUrl}
            onChange={setTiktokUrl}
            error={errors.tiktokUrl}
            disabled={saving}
            placeholder="https://tiktok.com/@..."
          />
        </div>

        <div className="space-y-2">
          <Label>Portfolio links (max 2)</Label>
          {portfolioUrls.map((url, index) => (
            <div key={`portfolio-${index}`} className="flex gap-2">
              <Input
                value={url}
                onChange={(event) => {
                  const next = [...portfolioUrls];
                  next[index] = event.target.value;
                  setPortfolioUrls(next);
                }}
                placeholder="https://..."
                disabled={saving}
              />
              {portfolioUrls.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-slate-900"
                  disabled={saving}
                  onClick={() =>
                    setPortfolioUrls((prev) =>
                      prev.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {portfolioUrls.length < 2 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-900"
              disabled={saving}
              onClick={() => setPortfolioUrls((prev) => [...prev, ""])}
            >
              <Plus className="h-4 w-4" />
              Add portfolio link
            </Button>
          ) : null}
          {errors.portfolioUrls ? (
            <p className="text-xs text-red-500">{errors.portfolioUrls}</p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Preview
          </p>
          <SocialLinksPreview
            linkedinUrl={linkedinUrl}
            githubUrl={githubUrl}
            instagramUrl={instagramUrl}
            youtubeUrl={youtubeUrl}
            twitterUrl={twitterUrl}
            tiktokUrl={tiktokUrl}
            portfolioUrls={portfolioUrls.map((url) => url.trim()).filter(Boolean)}
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save public profile"}
        </Button>
      </div>
    </SettingsSectionCard>
  );
}

function UrlField({
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
