import type { Metadata, Viewport } from "next";
import { Exo_2, JetBrains_Mono, Russo_One } from "next/font/google";
import "./globals.css";

const display = Russo_One({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-russo" });
const body = Exo_2({ subsets: ["latin", "cyrillic"], variable: "--font-exo" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jb" });

export const metadata: Metadata = {
  title: "Shadowrun DM Assistant",
  description: "Ассистент мастера Shadowrun (20th Anniversary Edition): интерактивные карты, листы персонажей и журнал сессий",
  appleWebApp: { capable: true, title: "SR DM", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the map and bottom sheets reach under the notch; safe-area insets pad the controls.
  viewportFit: "cover",
  themeColor: "#05080a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
