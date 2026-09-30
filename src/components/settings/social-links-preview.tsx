"use client";

import { Link2 } from "lucide-react";

import {
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  PortfolioLinkIcon,
  TikTokIcon,
  XTwitterIcon,
  YouTubeIcon,
} from "@/components/icons/social-brand-icons";
import type { ProfileCustomLink } from "@/lib/settings/profile-links";

type SocialLinksPreviewProps = {
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
  portfolioLinks?: ProfileCustomLink[];
};

type PreviewLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function SocialLinksPreview({
  linkedinUrl,
  githubUrl,
  instagramUrl,
  youtubeUrl,
  twitterUrl,
  tiktokUrl,
  portfolioLinks = [],
}: SocialLinksPreviewProps) {
  const links: PreviewLink[] = [
    linkedinUrl
      ? { href: linkedinUrl, label: "LinkedIn", icon: <LinkedInIcon /> }
      : null,
    githubUrl
      ? { href: githubUrl, label: "GitHub", icon: <GitHubIcon /> }
      : null,
    instagramUrl
      ? { href: instagramUrl, label: "Instagram", icon: <InstagramIcon /> }
      : null,
    youtubeUrl
      ? { href: youtubeUrl, label: "YouTube", icon: <YouTubeIcon /> }
      : null,
    twitterUrl
      ? { href: twitterUrl, label: "X", icon: <XTwitterIcon /> }
      : null,
    tiktokUrl
      ? { href: tiktokUrl, label: "TikTok", icon: <TikTokIcon /> }
      : null,
    ...portfolioLinks
      .filter((link) => link.label.trim() && link.url.trim())
      .map((link) => ({
        href: link.url.trim(),
        label: link.label.trim(),
        icon: <PortfolioLinkIcon />,
      })),
  ].filter(Boolean) as PreviewLink[];

  if (links.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        Saved social and custom links will appear here with their labels.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          title={link.href}
          className="inline-flex max-w-full items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-sky-50"
        >
          <span className="shrink-0">{link.icon}</span>
          <span className="min-w-0 truncate">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
