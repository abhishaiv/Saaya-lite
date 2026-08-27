import { bundledZoneRepository } from "@/src/data/repository/zoneRepository";
import { HomeScreen } from "@/src/ui/screens/home/HomeScreen";
import type { SaayaLocale } from "@/src/ui/copy/strings";

type HomePageProps = Readonly<{
  searchParams?: Readonly<Record<string, string | string[] | undefined>>;
}>;

export default function HomePage({ searchParams }: HomePageProps) {
  const locale: SaayaLocale = searchParams?.lang === "te" ? "te" : "en";
  const versionName = process.env.NEXT_PUBLIC_SAAYA_VERSION_NAME;
  const versionCodeText = process.env.NEXT_PUBLIC_SAAYA_VERSION_CODE;
  if (
    versionName === undefined ||
    versionCodeText === undefined ||
    !/^\d+$/.test(versionCodeText)
  ) {
    throw new Error("Saaya build metadata is missing or invalid");
  }
  const { demoZones, mapZones, policeStations, zoneDetails } =
    bundledZoneRepository.snapshot();
  return (
    <HomeScreen
      buildVersion={{ name: versionName, code: Number(versionCodeText) }}
      demoZones={demoZones}
      founderContact={process.env.SAAYA_FOUNDER_CONTACT?.trim() || null}
      locale={locale}
      mapZones={mapZones}
      policeStations={policeStations}
      zoneDetails={zoneDetails}
    />
  );
}
