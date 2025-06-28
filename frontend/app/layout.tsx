import React from 'react';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import GraphQLProvider from '@/lib/apollo/apollo-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import RecruiterGreetingModal from '@/components/recruiter-greeting-modal';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Magnus Henkel's Developer Portfolio",
  description: 'A showcase of my projects, skills, and experience as a developer.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <GraphQLProvider>
            <RecruiterGreetingModal />
            {children}
          </GraphQLProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
