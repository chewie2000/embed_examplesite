import { ClerkProvider } from '@clerk/nextjs';
import { DM_Sans, DM_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

// Body/UI face — matches Sigma's real site (DM Sans).
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
// Monospace — matches Sigma's real site (DM Mono).
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
// Headline/display face — Sigma's site uses a proprietary font ("Advercase") we
// don't have rights to redistribute. Space Grotesk stands in: same quirky,
// bold-geometric character, reserved for headlines only (never body copy).
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata = {
  title: 'Embed Success',
  description: 'Embedded analytics that feel native to your product.',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${spaceGrotesk.variable}`}>
        <body className="bg-white text-zinc-900 antialiased font-[family-name:var(--font-sans)]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
