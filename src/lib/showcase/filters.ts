import type {
  PortfolioCategory,
  PortfolioSort,
  ShowcasePortfolio,
} from "@/types/showcase";

export const portfolioCategories: PortfolioCategory[] = [
  "All",
  "Web Development",
  "Mobile App",
  "AI & Data",
  "UI/UX Design",
  "IoT",
  "Game Dev",
];

export function filterShowcasePortfolios(
  portfolios: ShowcasePortfolio[],
  category: PortfolioCategory,
  sort: PortfolioSort,
): ShowcasePortfolio[] {
  const filtered =
    category === "All"
      ? portfolios
      : portfolios.filter((item) => item.category === category);

  const sorted = [...filtered];

  switch (sort) {
    case "latest":
      sorted.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      break;
    case "trending":
      sorted.sort((a, b) => b.viewCount - a.viewCount);
      break;
    case "top-rated":
      sorted.sort((a, b) => b.grade - a.grade);
      break;
  }

  return sorted;
}
