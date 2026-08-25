import { notFound } from "next/navigation";

import { ComponentGallery } from "@/src/ui/gallery/ComponentGallery";

export default function ComponentGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ComponentGallery />;
}
