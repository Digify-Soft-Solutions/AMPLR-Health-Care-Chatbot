import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'AMPLR WhatsApp Inquiry Management System',
  description: 'AMPLR Health - Real-Time WhatsApp Inquiries, Client Leads, Doctor-Guided Home Healthcare & Booking ERP System',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏥</text></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-slate-950 text-slate-100 font-sans min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
