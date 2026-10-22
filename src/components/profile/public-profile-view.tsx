"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Copy,
  GraduationCap,
  Link2,
  Share2,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CollapsibleRichText } from "@/components/profile/collapsible-rich-text";
import { ProfilePhotoLightbox } from "@/components/profile/profile-photo-lightbox";
import { SocialLinksPreview } from "@/components/settings/social-links-preview";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { clientEnv } from "@/config/env-client";
import type { PublicProfileRecord } from "@/lib/profiles/public-profile";
import { cn } from "@/lib/utils";

type PublicProfileViewProps = {
  profile: PublicProfileRecord;
};

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => `${clientEnv.NEXT_PUBLIC_APP_URL}${profile.profilePath}`,
    [profile.profilePath],
  );

  const isStudent = profile.role === "STUDENT";
  const accent = isStudent
    ? {
        badge: "border-sky-300 bg-sky-50 text-sky-800",
        hero: "from-sky-100 via-cyan-50 to-amber-50",
        ring: "border-inkcuba-cyan",
        chip: "border-sky-200 bg-sky-50 text-sky-900",
        cta: "bg-inkcuba-cyan hover:bg-sky-600",
        panel: "from-sky-50/90 via-white to-cyan-50/50",
      }
    : {
        badge: "border-violet-300 bg-violet-50 text-violet-900",
        hero: "from-violet-100 via-fuchsia-50 to-orange-50",
        ring: "border-inkcuba-purple",
        chip: "border-violet-200 bg-violet-50 text-violet-900",
        cta: "bg-inkcuba-purple hover:bg-violet-700",
        panel: "from-violet-50/90 via-white to-fuchsia-50/40",
      };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Profile link copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Unable to copy link");
    }
  }

  async function shareProfile() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name} · inkcuba`,
          text: `View ${profile.name}'s ${profile.roleLabel.toLowerCase()} profile on inkcuba`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable — fall through to copy.
      }
    }
    await copyLink();
  }

  const metaChips = [
    profile.campusLabel
      ? { label: profile.campusLabel, icon: Building2 }
      : null,
    profile.majorLabel
      ? { label: profile.majorLabel, icon: GraduationCap }
      : null,
    profile.departmentLabel
      ? { label: profile.departmentLabel, icon: Briefcase }
      : null,
    profile.batchLabel
      ? { label: `Batch ${profile.batchLabel}`, icon: UsersRound }
      : null,
    profile.semesterLabel
      ? { label: profile.semesterLabel, icon: CalendarDays }
      : null,
    profile.alumniLabel
      ? { label: profile.alumniLabel, icon: GraduationCap }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: typeof Building2;
  }>;

  const hasSocialLinks =
    Boolean(profile.social.linkedinUrl) ||
    Boolean(profile.social.githubUrl) ||
    Boolean(profile.social.instagramUrl) ||
    Boolean(profile.social.youtubeUrl) ||
    Boolean(profile.social.twitterUrl) ||
    Boolean(profile.social.tiktokUrl) ||
    profile.social.portfolioLinks.some(
      (link) => link.label.trim() && link.url.trim(),
    );

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-br opacity-90",
          accent.hero,
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-inkcuba-doodle opacity-40"
      />

      <div className="relative mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border-2 border-inkcuba-navy bg-white shadow-inkcuba"
        >
          <div
            className={cn(
              "border-b-2 border-inkcuba-navy bg-gradient-to-r px-5 py-6 sm:px-8 sm:py-7",
              accent.hero,
            )}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (profile.image) setLightboxOpen(true);
                  }}
                  className={cn(
                    "group relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 bg-white shadow-inkcuba transition sm:mx-0 sm:h-32 sm:w-32",
                    accent.ring,
                    profile.image && "cursor-zoom-in hover:scale-[1.02]",
                  )}
                  aria-label={
                    profile.image
                      ? "Open profile photo"
                      : "Profile photo unavailable"
                  }
                  disabled={!profile.image}
                >
                  <UserAvatar
                    name={profile.name}
                    image={profile.image}
                    size="lg"
                    className="!h-full !w-full !max-h-none !max-w-none border-0"
                  />
                  {profile.image ? (
                    <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      Zoom
                    </span>
                  ) : null}
                </button>

                <div className="min-w-0 text-center sm:text-left">
                  <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                        accent.badge,
                      )}
                    >
                      {isStudent ? (
                        <GraduationCap className="h-3 w-3" />
                      ) : (
                        <Briefcase className="h-3 w-3" />
                      )}
                      {profile.roleLabel}
                    </span>
                    {profile.binusianId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                        <BadgeCheck className="h-3 w-3 text-emerald-600" />
                        {profile.binusianId}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                    {profile.name}
                  </h1>
                  {profile.title ? (
                    <p className="mt-1 text-sm font-medium text-slate-600 sm:text-base">
                      {profile.title}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      {isStudent
                        ? "Student portfolio showcase"
                        : "Faculty profile & academic work"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-900"
                  onClick={() => void copyLink()}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy link
                </Button>
                <Button
                  type="button"
                  className={cn("text-white shadow-inkcuba", accent.cta)}
                  onClick={() => void shareProfile()}
                >
                  <Share2 className="h-4 w-4" />
                  Share profile
                </Button>
              </div>
            </div>
          </div>

          {metaChips.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3.5 sm:px-8">
              {metaChips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold",
                      accent.chip,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {chip.label}
                  </span>
                );
              })}
            </div>
          ) : null}

          <div className="grid items-start gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(240px,18rem)] lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="space-y-5"
            >
              <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="font-heading text-lg font-bold text-slate-900">
                  Skills
                </h2>
                {profile.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No skills listed yet.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="font-heading text-lg font-bold text-slate-900">
                  About
                </h2>
                {profile.bioHtml ? (
                  <CollapsibleRichText
                    html={profile.bioHtml}
                    className="mt-3"
                    collapsedMaxHeight={220}
                  />
                ) : (
                  <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    This {profile.roleLabel.toLowerCase()} has not added a
                    public bio yet.
                  </p>
                )}
              </section>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className={cn(
                "h-fit rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br p-4 shadow-inkcuba sm:p-5",
                accent.panel,
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-inkcuba-navy" />
                <h2 className="font-heading text-base font-bold text-slate-900">
                  Connect
                </h2>
              </div>
              {hasSocialLinks ? (
                <SocialLinksPreview
                  linkedinUrl={profile.social.linkedinUrl}
                  githubUrl={profile.social.githubUrl}
                  instagramUrl={profile.social.instagramUrl}
                  youtubeUrl={profile.social.youtubeUrl}
                  twitterUrl={profile.social.twitterUrl}
                  tiktokUrl={profile.social.tiktokUrl}
                  portfolioLinks={profile.social.portfolioLinks}
                />
              ) : (
                <p className="text-sm text-slate-500">
                  No public links yet.
                </p>
              )}
            </motion.aside>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-3xl border-2 border-inkcuba-navy bg-white p-5 shadow-inkcuba sm:p-7"
        >
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-slate-900">
              {isStudent ? "Verified portfolios" : "Verified projects & work"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Only lecturer-verified exhibition work appears here.
            </p>
          </div>

          {profile.verifiedPortfolios.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white px-5 py-8 text-center">
              <Sparkles className="mx-auto mb-3 h-7 w-7 text-inkcuba-orange" />
              <p className="font-heading text-base font-bold text-slate-900">
                Showcase coming soon
              </p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
                Verified portfolios and projects will show up on this public page
                once submissions and lecturer verification go live.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.verifiedPortfolios.map((item) => (
                <a
                  key={item.id}
                  href={item.href ?? "#"}
                  className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba transition hover:-translate-y-0.5"
                >
                  <h3 className="font-heading font-bold text-slate-900">
                    {item.title}
                  </h3>
                  {item.summary ? (
                    <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {profile.image ? (
        <ProfilePhotoLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          src={profile.image}
          alt={profile.name}
        />
      ) : null}
    </div>
  );
}
