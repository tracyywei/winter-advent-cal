import type { Metadata } from "next";
import "@/components/studio/studio.css";
import "@/components/village/village.css";

export const metadata: Metadata = {
  title: "Advent Studio 🎄",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return <div className="st">{children}</div>;
}
