import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const googleSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-google-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'XAI-CDSS | Explainable AI Framework for NCD Risk Assessment',
  description:
    'An Integrated Explainable AI (XAI) Framework for Early Risk Assessment of Lifestyle-Induced Non-Communicable Diseases via Multimodal Data Fusion — B.Tech Major Project, SRM Institute of Science and Technology',
  keywords: [
    'Explainable AI',
    'SHAP',
    'Clinical Decision Support',
    'NCD Risk Assessment',
    'Type-2 Diabetes',
    'Machine Learning',
    'Ensemble Learning',
    'BRFSS',
  ],
  authors: [
    { name: 'Vimal M' },
    { name: 'Alfred Ferdinand' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={googleSans.variable}>
      <body className={`${googleSans.className} min-h-screen`}>{children}</body>
    </html>
  );
}
