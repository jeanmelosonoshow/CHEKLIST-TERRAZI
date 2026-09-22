import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terrazi Fluxos",
  description: "Controle de processos e checklists",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
