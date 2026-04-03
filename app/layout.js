import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Embed Success',
  description: 'Embedded analytics that feel native to your product.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#09090b] text-zinc-100 antialiased font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
