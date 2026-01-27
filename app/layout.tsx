import type { Metadata } from 'next';
import { Inter, Indie_Flower } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });
const indieFlower = Indie_Flower({ weight: '400', subsets: ['latin'], variable: '--font-indie-flower' });

export const metadata: Metadata = {
  title: 'Sticky Board',
  description: 'Premium sticky notes app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${indieFlower.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
