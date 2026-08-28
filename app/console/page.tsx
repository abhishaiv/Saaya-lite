import type { Metadata } from "next";

import { ConsoleScreen } from "../../src/ui/screens/console/ConsoleScreen";

export const metadata: Metadata = {
  title: "Saaya Lite — State View Console",
  description: "Control room state view demonstrating anonymous civic signals and emergency SOS incidents for Visakhapatnam.",
};

export default function ConsolePage() {
  return <ConsoleScreen />;
}
