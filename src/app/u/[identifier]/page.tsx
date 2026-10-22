import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import { clientEnv } from "@/config/env-client";
import { getPublicProfileByIdentifier } from "@/lib/profiles/public-profile";

type PageProps = {
  params: Promise<{ identifier: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { identifier } = await params;
  try {
    const profile = await getPublicProfileByIdentifier(identifier);
    const description = profile.title
      ? `${profile.roleLabel} · ${profile.title} on inkcuba`
      : `${profile.roleLabel} public profile on inkcuba`;
    return {
      title: `${profile.name} · ${profile.roleLabel}`,
      description,
      openGraph: {
        title: `${profile.name} · inkcuba`,
        description,
        url: `${clientEnv.NEXT_PUBLIC_APP_URL}${profile.profilePath}`,
        type: "profile",
      },
    };
  } catch {
    return { title: "Profile" };
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { identifier } = await params;

  let profile;
  try {
    profile = await getPublicProfileByIdentifier(identifier);
  } catch {
    notFound();
  }

  // Canonicalize student NIM URLs vs id URLs when possible
  if (profile.profilePath !== `/u/${encodeURIComponent(identifier)}`) {
    // Soft: still render; avoid hard redirect loops for case differences
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-slate-50">
        <PublicProfileView profile={profile} />
      </main>
      <SiteFooter />
    </>
  );
}
