import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialPilot",
  description: "Programa publicaciones en tus redes sociales y mide sus resultados.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
