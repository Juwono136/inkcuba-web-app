"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/settings/rich-text-editor";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { SocialLinksPreview } from "@/components/settings/social-links-preview";
import {
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  XTwitterIcon,
  YouTubeIcon,
} from "@/components/icons/social-brand-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientEnv } from "@/config/env-client";
import type { UserRole } from "@/lib/auth/permissions";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import type {
  SettingsPayload,
  SettingsPublicProfile,
} from "@/lib/settings/get-settings";
import { plainTextFromHtml } from "@/lib/settings/plain-text";
import {
  BIO_MAX_PLAIN_LENGTH,
} from "@/lib/settings/bio-limits";
import {
  emptyProfileCustomLink,
  finalizeProfileCustomLinks,
  PROFILE_CUSTOM_LINK_LABEL_MAX,
  PROFILE_CUSTOM_LINKS_MAX,
  type ProfileCustomLink,
} from "@/lib/settings/profile-links";
import { publicProfileSchema } from "@/lib/validators/settings";

type PublicProfileSectionProps = {
  userId: string;
  role: UserRole;
  nim: string | null;
  initialProfile: SettingsPublicProfile;
  onSaved: (settings: SettingsPayload) => void;
};

type PendingRemoval =
  | { type: "skill"; value: string }
  | { type: "portfolio"; index: number }
  | null;

export function PublicProfileSection({
  userId,
  role,
  nim,
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
  const [portfolioLinks, setPortfolioLinks] = useState<ProfileCustomLink[]>(
    initialProfile.portfolioLinks?.length
      ? initialProfile.portfolioLinks.map((link) => ({
          label: link.label,
          url: link.url,
        }))
      : [emptyProfileCustomLink()],
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>(null);
  const [copied, setCopied] = useState(false);

  const profilePath = useMemo(
    () => getPublicProfileHref({ id: userId, role, nim }),
    [userId, role, nim],
  );
  const shareUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}${profilePath}`;

  const bioLength = plainTextFromHtml(bio).length;

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Public profile link copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Unable to copy link");
    }
  }

  function buildPayload() {
    return {
      bio,
      skills,
      linkedinUrl: linkedinUrl || undefined,
      githubUrl: githubUrl || undefined,
      instagramUrl: instagramUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      twitterUrl: twitterUrl || undefined,
      tiktokUrl: tiktokUrl || undefined,
      portfolioLinks: finalizeProfileCustomLinks(portfolioLinks),
    };
  }

  function addSkill() {
    const next = skillDraft.trim();
    if (!next) return;

    if (skills.length >= 10) {
      toast.error("You can add at most 10 skills");
      return;
    }

    if (next.length > 30) {
      toast.error("Each skill must be at most 30 characters");
      return;
    }

    if (skills.some((skill) => skill.toLowerCase() === next.toLowerCase())) {
      toast.error("Skill already added");
      return;
    }

    setSkills((prev) => [...prev, next]);
    setSkillDraft("");
  }

  function requestSave() {
    setErrors({});

    const payload = buildPayload();
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

    if (bioLength > BIO_MAX_PLAIN_LENGTH) {
      setErrors({
        bio: `Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters`,
      });
      toast.error(`Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters`);
      return;
    }

    // Reject half-filled custom link rows before save
    const incomplete = portfolioLinks.some(
      (link) =>
        (link.label.trim() && !link.url.trim()) ||
        (!link.label.trim() && link.url.trim()),
    );
    if (incomplete) {
      setErrors({
        portfolioLinks: "Each custom link needs both a name and a URL",
      });
      toast.error("Each custom link needs both a name and a URL");
      return;
    }

    setConfirmSaveOpen(true);
  }

  async function handleSave() {
    setErrors({});

    const payload = buildPayload();
    const parsed = publicProfileSchema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the form errors");
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile");
    }

    if (bioLength > BIO_MAX_PLAIN_LENGTH) {
      setErrors({
        bio: `Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters`,
      });
      toast.error(`Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters`);
      throw new Error(`Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters`);
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
      const savedLinks = data.data.publicProfile?.portfolioLinks ?? [];
      setPortfolioLinks(
        savedLinks.length > 0
          ? savedLinks.map((link) => ({ ...link }))
          : [emptyProfileCustomLink()],
      );
      toast.success("Public profile saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile",
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function confirmPendingRemoval() {
    if (!pendingRemoval) return;

    if (pendingRemoval.type === "skill") {
      setSkills((prev) =>
        prev.filter((item) => item !== pendingRemoval.value),
      );
    } else {
      setPortfolioLinks((prev) => {
        const next = prev.filter((_, index) => index !== pendingRemoval.index);
        return next.length > 0 ? next : [emptyProfileCustomLink()];
      });
    }

    setPendingRemoval(null);
  }

  const removalDescription =
    pendingRemoval?.type === "skill"
      ? `Remove “${pendingRemoval.value}” from your skills list?`
      : pendingRemoval?.type === "portfolio"
        ? "Remove this custom link from your public profile?"
        : "";

  return (
    <SettingsSectionCard
      title="Public Profile"
      description="This information appears on your public inkcuba profile page — share it for branding and showcase."
      delay={0.15}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
              Your public profile
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Share or preview how your profile appears to others.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-900"
              onClick={() => void copyPublicLink()}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy link
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
              asChild
            >
              <Link
                href={profilePath}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View public page
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Bio</Label>
            <span
              className={
                bioLength > BIO_MAX_PLAIN_LENGTH
                  ? "text-xs text-red-500"
                  : "text-xs text-slate-500"
              }
            >
              {bioLength}/{BIO_MAX_PLAIN_LENGTH}
            </span>
          </div>
          <RichTextEditor value={bio} onChange={setBio} disabled={saving} />
          {errors.bio ? (
            <p className="text-xs text-red-500">{errors.bio}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Use bold, italic, lists, and links. Plain text is limited to{" "}
              {BIO_MAX_PLAIN_LENGTH.toLocaleString()} characters.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Skills</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={skillDraft}
              onChange={(event) => setSkillDraft(event.target.value)}
              placeholder="e.g. React"
              disabled={saving}
              maxLength={30}
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
              disabled={saving || !skillDraft.trim()}
              className="border-slate-900 sm:shrink-0"
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
                    setPendingRemoval({ type: "skill", value: skill })
                  }
                  disabled={saving}
                  className="inline-flex max-w-full items-center gap-1 rounded-xl border-2 border-slate-900 bg-sky-50 px-2.5 py-1 text-xs font-semibold break-words text-slate-800 transition-colors hover:bg-sky-100 [overflow-wrap:anywhere]"
                >
                  <span className="min-w-0">{skill}</span>
                  <X className="h-3 w-3 shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Add up to 10 skills that appear on your profile.
            </p>
          )}
          {errors.skills ? (
            <p className="text-xs text-red-500">{errors.skills}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <UrlField
            label="LinkedIn"
            icon={<LinkedInIcon />}
            value={linkedinUrl}
            onChange={setLinkedinUrl}
            error={errors.linkedinUrl}
            disabled={saving}
            placeholder="https://linkedin.com/in/..."
          />
          <UrlField
            label="GitHub"
            icon={<GitHubIcon />}
            value={githubUrl}
            onChange={setGithubUrl}
            error={errors.githubUrl}
            disabled={saving}
            placeholder="https://github.com/..."
          />
          <UrlField
            label="Instagram"
            icon={<InstagramIcon />}
            value={instagramUrl}
            onChange={setInstagramUrl}
            error={errors.instagramUrl}
            disabled={saving}
            placeholder="https://instagram.com/..."
          />
          <UrlField
            label="YouTube"
            icon={<YouTubeIcon />}
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            error={errors.youtubeUrl}
            disabled={saving}
            placeholder="https://youtube.com/..."
          />
          <UrlField
            label="X (Twitter)"
            icon={<XTwitterIcon />}
            value={twitterUrl}
            onChange={setTwitterUrl}
            error={errors.twitterUrl}
            disabled={saving}
            placeholder="https://x.com/..."
          />
          <UrlField
            label="TikTok"
            icon={<TikTokIcon />}
            value={tiktokUrl}
            onChange={setTiktokUrl}
            error={errors.tiktokUrl}
            disabled={saving}
            placeholder="https://tiktok.com/@..."
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Custom links (max {PROFILE_CUSTOM_LINKS_MAX})</Label>
            <p className="text-xs text-slate-500">
              Add personal or professional links with your own labels — for
              example Behance, personal site, or a course showcase.
            </p>
          </div>
          {portfolioLinks.map((link, index) => (
            <div
              key={`custom-link-${index}`}
              className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-start"
            >
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={`custom-link-label-${index}`}
                  className="text-[11px] text-slate-500"
                >
                  Link name
                </Label>
                <Input
                  id={`custom-link-label-${index}`}
                  value={link.label}
                  onChange={(event) => {
                    const next = [...portfolioLinks];
                    next[index] = {
                      ...next[index],
                      label: event.target.value.slice(
                        0,
                        PROFILE_CUSTOM_LINK_LABEL_MAX,
                      ),
                    };
                    setPortfolioLinks(next);
                  }}
                  placeholder="e.g. Behance"
                  disabled={saving}
                  maxLength={PROFILE_CUSTOM_LINK_LABEL_MAX}
                  aria-invalid={Boolean(errors.portfolioLinks)}
                  className="min-w-0 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label
                  htmlFor={`custom-link-url-${index}`}
                  className="text-[11px] text-slate-500"
                >
                  URL
                </Label>
                <Input
                  id={`custom-link-url-${index}`}
                  value={link.url}
                  onChange={(event) => {
                    const next = [...portfolioLinks];
                    next[index] = { ...next[index], url: event.target.value };
                    setPortfolioLinks(next);
                  }}
                  placeholder="https://..."
                  disabled={saving}
                  aria-invalid={Boolean(errors.portfolioLinks)}
                  className="min-w-0 rounded-xl border-2 border-slate-300 bg-white"
                />
              </div>
              {portfolioLinks.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-0 shrink-0 border-slate-900 sm:mt-6"
                  disabled={saving}
                  aria-label={`Remove custom link ${index + 1}`}
                  onClick={() => {
                    if (link.label.trim() || link.url.trim()) {
                      setPendingRemoval({ type: "portfolio", index });
                      return;
                    }
                    setPortfolioLinks((prev) => {
                      const next = prev.filter(
                        (_, itemIndex) => itemIndex !== index,
                      );
                      return next.length > 0
                        ? next
                        : [emptyProfileCustomLink()];
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <span className="hidden sm:block" aria-hidden />
              )}
            </div>
          ))}
          {portfolioLinks.length < PROFILE_CUSTOM_LINKS_MAX ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-900"
              disabled={saving}
              onClick={() =>
                setPortfolioLinks((prev) => [...prev, emptyProfileCustomLink()])
              }
            >
              <Plus className="h-4 w-4" />
              Add custom link
            </Button>
          ) : null}
          {errors.portfolioLinks ? (
            <p className="text-xs text-red-500">{errors.portfolioLinks}</p>
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
            portfolioLinks={finalizeProfileCustomLinks(portfolioLinks)}
          />
        </div>

        <Button
          type="button"
          onClick={requestSave}
          disabled={saving}
          className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save public profile"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title="Save public profile?"
        description="Your bio, skills, and social links will be updated on your public exhibition profile."
        confirmLabel="Save profile"
        loading={saving}
        onConfirm={handleSave}
      />

      <ConfirmDialog
        open={pendingRemoval != null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={
          pendingRemoval?.type === "skill"
            ? "Remove skill?"
            : "Remove portfolio link?"
        }
        description={removalDescription}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmPendingRemoval}
      />
    </SettingsSectionCard>
  );
}

function UrlField({
  label,
  icon,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="inline-flex max-w-full items-center gap-2">
        {icon}
        <span className="truncate">{label}</span>
      </Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className="min-w-0"
      />
      {error ? (
        <p className="text-xs break-words text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
