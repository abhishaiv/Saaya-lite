"use client";

import { useSearchParams } from "next/navigation";

import { ZoneDataFatalState } from "@/src/ui/screens/home/ZoneDataFatalState";

export default function RouteError() {
  const searchParams = useSearchParams();
  const locale = searchParams.get("lang") === "te" ? "te" : "en";

  return (
    <ZoneDataFatalState
      locale={locale}
      onRetry={() => window.location.reload()}
    />
  );
}
