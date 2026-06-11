import { Briefcase, Globe, Play, Share2, Users, type LucideIcon } from "lucide-react";

export type BinusLink = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

export const binusLinks: BinusLink[] = [
  {
    id: "website",
    label: "BINUS Official Website",
    description: "Programs, admissions, and university news",
    href: "https://www.binus.ac.id/",
    icon: Globe,
    accent: "from-sky-500 to-cyan-400",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Campus life, events, and student stories",
    href: "https://www.instagram.com/binusuniv/",
    icon: Users,
    accent: "from-pink-500 via-purple-500 to-orange-400",
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Lectures, highlights, and university content",
    href: "https://www.youtube.com/user/BINUSUniversity",
    icon: Play,
    accent: "from-red-500 to-red-600",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Alumni network and career opportunities",
    href: "https://www.linkedin.com/school/binus-university/",
    icon: Briefcase,
    accent: "from-blue-600 to-sky-500",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Community updates and official announcements",
    href: "https://www.facebook.com/BINUSUniversity",
    icon: Share2,
    accent: "from-blue-700 to-blue-500",
  },
];
