"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

import { PortfolioSearchDialog } from "@/components/search/portfolio-search-dialog";
import { Toaster } from "@/components/ui/sonner";

const SessionWatcher = dynamic(
  () =>
    import("@/components/providers/session-watcher").then(
      (module) => module.SessionWatcher,
    ),
  { ssr: false },
);

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <SessionWatcher />
      <PortfolioSearchDialog />
      <Toaster richColors closeButton position="top-center" />
    </QueryClientProvider>
  );
}
