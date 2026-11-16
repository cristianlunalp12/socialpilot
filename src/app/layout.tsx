import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialPilot",
  description: "Presencia digital automatizada para pequeños y medianos negocios: contenido constante y comunidad en Instagram, sin contratar un community manager.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
