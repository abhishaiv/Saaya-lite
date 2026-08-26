import { bundledZoneRepository } from "@/src/data/repository/zoneRepository";
import { HomeScreen } from "@/src/ui/screens/home/HomeScreen";
import type { SaayaLocale } from "@/src/ui/copy/strings";

type HomePageProps = Readonly<{
  searchParams?: Readonly<Record<string, string | string[] | undefined>>;
}>;

export default function HomePage({ searchParams }: HomePageProps) {
  const locale: SaayaLocale = searchParams?.lang === "te" ? "te" : "en";
  const { demoZones, mapZones, policeStations, zoneDetails } =
    bundledZoneRepository.snapshot();
  return (
    <HomeScreen
      demoZones={demoZones}
      locale={locale}
      mapZones={mapZones}
      policeStations={policeStations}
      zoneDetails={zoneDetails}
    />
  );
}
