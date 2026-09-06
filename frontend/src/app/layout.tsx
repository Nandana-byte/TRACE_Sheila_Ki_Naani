import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/useAuth';

export const metadata: Metadata = {
  title: 'TRACE — AI-Powered Collective Intelligence for Finding Missing People',
  description: 'Every sighting is a clue. Every clue makes the search smarter.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
