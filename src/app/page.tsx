import { AboutSection } from "@/components/landing/about-section";
import { BinusSocialSection } from "@/components/landing/binus-social-section";
import { CoursesPreviewSection } from "@/components/landing/courses-preview";
import { CtaSection } from "@/components/landing/cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { PortfolioShowcase } from "@/components/landing/portfolio-showcase";
import { TeamSection } from "@/components/landing/team-section";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main>
        <HeroSection />
        <PortfolioShowcase />
        <AboutSection />
        <CoursesPreviewSection />
        <HowItWorksSection />
        <TeamSection />
        <BinusSocialSection />
        <CtaSection />
      </main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
