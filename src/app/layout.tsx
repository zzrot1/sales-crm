import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { Outfit, Nunito_Sans, JetBrains_Mono } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
export const metadata: Metadata = {
  title: "Sales CRM",
  description: "Sales CRM with feature-based structure",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${nunitoSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="typeset-app">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
