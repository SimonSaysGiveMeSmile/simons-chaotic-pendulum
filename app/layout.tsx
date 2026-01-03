import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chaotic Pendulum - 3D Physics Simulation",
  description: "Web-based 3D simulation with real physics and high-quality rendering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

