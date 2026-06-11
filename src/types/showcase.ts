export type PortfolioCategory =
  | "All"
  | "Web Development"
  | "Mobile App"
  | "AI & Data"
  | "UI/UX Design"
  | "IoT"
  | "Game Dev";

export type PortfolioSort = "latest" | "trending" | "top-rated";

export type ShowcasePortfolio = {
  id: string;
  slug: string;
  title: string;
  description: string;
  studentName: string;
  studentNim: string;
  major: string;
  batch: string;
  lecturerName: string;
  courseCode: string;
  courseName: string;
  category: Exclude<PortfolioCategory, "All">;
  type: "INDIVIDUAL" | "GROUP";
  technologyTags: string[];
  viewCount: number;
  publishedAt: string;
  grade: number;
  posterClass: string;
};

export type ShowcaseCourse = {
  id: string;
  courseCode: string;
  courseName: string;
  className: string;
  semester: string;
  lecturerName: string;
  portfolioCount: number;
  studentCount: number;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  department: string;
};
