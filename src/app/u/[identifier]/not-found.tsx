import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function PublicProfileNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-16">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-heading text-2xl font-bold text-slate-900">
            Profile not found
          </h1>
          <p className="text-sm text-slate-600">
            This public profile is unavailable, inactive, or the link is
            incorrect.
          </p>
          <Button asChild className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
