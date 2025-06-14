import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GraphQLProvider from "@/lib/apollo/apollo-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Magnus Henkel's Developer Portfolio",
  description:
    "A showcase of my projects, skills, and experience as a developer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GraphQLProvider>{children}</GraphQLProvider>
      </body>
    </html>
  );
}
