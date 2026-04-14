import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { TenantProvider } from '@/lib/tenant-context';
import { ThemeProvider } from '@/lib/theme-context';
import { SettingsProvider } from '@/lib/settings-context';
import { Toaster } from '@/components/ui/sonner';
import { ChunkErrorRecovery } from '@/components/shared/chunk-error-recovery';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    template: '%s | ERP',
    default: 'ERP System',
  },
  description: 'Enterprise Resource Planning System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="settings-ui-standard">
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <SettingsProvider>
                <ChunkErrorRecovery />
                {children}
                <Toaster />
              </SettingsProvider>
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
