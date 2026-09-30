export const DIRECTORY_OPTION_CATEGORIES = [
  "campus",
  "major",
  "batch",
  "semester",
  "department",
] as const;

export type DirectoryOptionCategory =
  (typeof DIRECTORY_OPTION_CATEGORIES)[number];

export const DIRECTORY_OPTION_CATEGORY_LABELS: Record<
  DirectoryOptionCategory,
  string
> = {
  campus: "Campus",
  major: "Major",
  batch: "Batch",
  semester: "Semester",
  department: "Department",
};

export type DirectoryOptionRecord = {
  id: string;
  category: DirectoryOptionCategory;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DirectoryOptionListPage = {
  items: DirectoryOptionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const DIRECTORY_OPTION_DEFAULT_PAGE_SIZE = 20;
export const DIRECTORY_OPTION_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
