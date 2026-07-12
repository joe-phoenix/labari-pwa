// app/layout.tsx
import type { Metadata } from 'next';
import { Source_Serif_4, DM_Sans } from 'next/font/google';
import './globals.css';
import { RegisterSW } from './register-sw';
import { ThemeProvider } from './ThemeProvider';
import { InstallPrompt } from './InstallPrompt';

// next/font self-hosts these at build time — no external request to fonts.gstatic.com,
// so there's no stale-CDN-hash risk like the hardcoded <link rel="preload"> this replaces.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--next-font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--next-font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Labari Media - Beyond The Surface',
  description: 'Pan-African tech and culture journalism, curated and readable offline.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Labari Media',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F2EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${dmSans.variable}`}>
      <body>
        <ThemeProvider>
          {children}
          <InstallPrompt />
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
