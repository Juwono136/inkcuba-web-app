"use client";

import { useQuery } from "@tanstack/react-query";

import type { DirectoryOptionCategory } from "@/lib/directory/types";

type OptionItem = { label: string; value: string; category: string };

async function fetchOptions(category?: DirectoryOptionCategory) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const response = await fetch(`/api/directory-options?${params.toString()}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    success: boolean;
    data?: { items: OptionItem[] };
    error?: { message: string };
  };
  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "Failed to load options");
  }
  return payload.data.items;
}

export function useDirectoryOptions(category?: DirectoryOptionCategory) {
  return useQuery({
    queryKey: ["directory-options", category ?? "all"],
    queryFn: () => fetchOptions(category),
    staleTime: 60_000,
  });
}

export function useAllDirectoryOptions() {
  return useQuery({
    queryKey: ["directory-options", "all"],
    queryFn: () => fetchOptions(),
    staleTime: 60_000,
  });
}

export function optionsForCategory(
  items: OptionItem[] | undefined,
  category: DirectoryOptionCategory,
  currentValue?: string | null,
): { label: string; value: string }[] {
  const base = (items ?? [])
    .filter((item) => item.category === category)
    .map((item) => ({ label: item.label, value: item.value }));

  if (
    currentValue &&
    !base.some((item) => item.value === currentValue)
  ) {
    return [{ label: `${currentValue} (inactive)`, value: currentValue }, ...base];
  }

  return base;
}
