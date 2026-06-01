import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/header';
import { I18nProvider } from '@/i18n/context';
import StarfieldBackground from '@/components/layout/starfield-background';
import { ToastProvider } from '@/components/layout/toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: '鉴微侦探 - Examine & Deduce',
    template: '%s | 鉴微侦探',
  },
  description: 'Upload an image and let master detectives analyze geography, environment, psychology, and predictions with unique推理 perspectives',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = cookieStore.get('locale')?.value || 'zh';

  return (
    <html lang={lang} className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'light') document.documentElement.classList.add('light');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans text-[var(--foreground)] relative">
        <ToastProvider>
          <StarfieldBackground />
          <div className="relative z-10 flex flex-col min-h-screen flex-1">
            <I18nProvider>
              <Header />
              <main className="flex-1">{children}</main>
            </I18nProvider>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
