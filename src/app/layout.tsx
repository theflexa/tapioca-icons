import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "TapiocaIcons",
  description: "Generate 3D animated icons in the Lava Icons style",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="dark">
        <body className="bg-zinc-950 text-zinc-100 min-h-screen">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
