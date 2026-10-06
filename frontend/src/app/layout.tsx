import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadowrun DM Assistant",
  description: "Ассистент мастера настольных ролевых игр: интерактивные карты, листы персонажей и журнал сессий",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
