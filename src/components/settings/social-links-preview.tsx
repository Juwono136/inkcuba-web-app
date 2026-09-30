"use client";

import { Globe, Link2 } from "lucide-react";

type SocialLinksPreviewProps = {
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
  portfolioUrls?: string[];
};

function BrandMark({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-900 bg-white text-[9px] font-bold tracking-tight text-slate-800"
      aria-hidden
    >
      {label}
    </span>
  );
}

export function SocialLinksPreview({
  linkedinUrl,
  githubUrl,
  instagramUrl,
  youtubeUrl,
  twitterUrl,
  tiktokUrl,
  portfolioUrls = [],
}: SocialLinksPreviewProps) {
  const links = [
    linkedinUrl
      ? { href: linkedinUrl, label: "LinkedIn", icon: <BrandMark label="in" /> }
      : null,
    githubUrl
      ? { href: githubUrl, label: "GitHub", icon: <BrandMark label="GH" /> }
      : null,
    instagramUrl
      ? { href: instagramUrl, label: "Instagram", icon: <BrandMark label="IG" /> }
      : null,
    youtubeUrl
      ? { href: youtubeUrl, label: "YouTube", icon: <BrandMark label="YT" /> }
      : null,
    twitterUrl
      ? { href: twitterUrl, label: "X", icon: <BrandMark label="X" /> }
      : null,
    tiktokUrl
      ? { href: tiktokUrl, label: "TikTok", icon: <BrandMark label="TT" /> }
      : null,
    ...portfolioUrls.filter(Boolean).map((href, index) => ({
      href,
      label: `Portfolio ${index + 1}`,
      icon: <Globe className="h-4 w-4" />,
    })),
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  if (links.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Link2 className="h-3.5 w-3.5" />
        Saved social links will appear here with brand marks.
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
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-sky-50"
        >
          {link.icon}
          {link.label}
        </a>
      ))}
    </div>
  );
}
