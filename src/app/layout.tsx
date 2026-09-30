import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import AuthNav from "@/components/AuthNav";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Hello World",
  description: "A space-themed Hello World page",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <AuthNav />
        {children}
      </body>
    </html>
  );
}
