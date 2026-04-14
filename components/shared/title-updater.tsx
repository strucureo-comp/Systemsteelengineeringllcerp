'use client';

import { useEffect } from 'react';
import { settingsApi } from '@/lib/settings-api';

export function TitleUpdater() {
    const applyFavicon = (favicon?: string | null) => {
        if (!favicon) return;
        const existing = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        const link = existing || document.createElement('link');
        link.rel = 'icon';
        link.href = favicon;
        if (!existing) {
            document.head.appendChild(link);
        }
    };

    useEffect(() => {
        const loadCompanyName = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('bb_token') : null;
            if (!token) return;

            try {
                const [company, branding] = await Promise.all([
                    settingsApi.getCompany(),
                    settingsApi.getBranding(),
                ]);
                const name = company?.companyName || 'BridgeBreak';
                document.title = `${name} - ERP`;
                applyFavicon(branding?.favicon || null);
            } catch {
                document.title = 'BridgeBreak - ERP';
            }
        };

        loadCompanyName();

        const interval = setInterval(loadCompanyName, 30000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return null;
}
