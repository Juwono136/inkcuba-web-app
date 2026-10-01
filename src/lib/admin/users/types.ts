import type { UserRole } from "@/lib/auth/permissions";
import type { DirectoryOptionCategory } from "@/lib/directory/types";

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  roleLabel: string;
  campus: string | null;
  binusianId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  lastLoginAt: string | null;
  /** Days remaining before automatic hard delete (trash view only). */
  daysUntilPurge: number | null;
};

/** Current Directory Options labels for directory-backed fields (values stay on base fields). */
export type AdminDirectoryLabels = Record<
  DirectoryOptionCategory,
  string | null
>;

export type AdminUserDetail = AdminUserListItem & {
  nim: string | null;
  nidn: string | null;
  major: string | null;
  batch: string | null;
  semester: string | null;
  isAlumni: boolean;
  alumniLabel: string | null;
  department: string | null;
  title: string | null;
  directoryLabels: AdminDirectoryLabels;
  bio: string | null;
  skills: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  portfolioLinks: { label: string; url: string }[];
};

export type AdminUserListPage = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  trash: boolean;
};

export type AdminUserMutationResult = {
  user: AdminUserDetail;
};
