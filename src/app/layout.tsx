import type { Metadata } from 'next';
import './globals.css';
import './modern-oak.css';

export const metadata: Metadata = {
  title: {
    default: 'AROMETRA — Spirituosen verstehen und entdecken',
    template: '%s — AROMETRA',
  },
  description: 'Produktwissen mit nachvollziehbaren Quellen und erklärbaren Alternativen.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
