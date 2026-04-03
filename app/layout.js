import './globals.css';

export const metadata = {
  title: 'Prism Analytics',
  description: 'Embedded analytics that feel native to your product.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
