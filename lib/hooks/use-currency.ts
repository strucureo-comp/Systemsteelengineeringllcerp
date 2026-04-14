'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPDFSettings } from '@/lib/pdf-settings';
import { formatCurrency, getCurrencySymbol, convertAmount, CURRENCY_NAMES } from '@/lib/currency';

// Broadcast currency change to all subscribed components
export function broadcastCurrencyChange(currencyCode: string) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp_currency_changed', { detail: { currency: currencyCode } }));
    }
}

interface UseCurrencyReturn {
    currencyCode: string;
    symbol: string;
    currencyName: string;
    format: (amount: number, options?: { compact?: boolean; showCode?: boolean }) => string;
    convert: (amount: number, fromCurrency: string) => Promise<number>;
    loading: boolean;
}

export function useCurrency(): UseCurrencyReturn {
    const [currencyCode, setCurrencyCode] = useState<string>('AED');
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        const settings = getPDFSettings();
        setCurrencyCode(settings.currency);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();

        // Listen for global settings updates
        window.addEventListener('erp_settings_updated', refresh);
        window.addEventListener('erp_company_settings_changed', (e: any) => {
            if (e.detail?.baseCurrency) {
                setCurrencyCode(e.detail.baseCurrency);
            } else {
                refresh();
            }
        });
        window.addEventListener('storage', (e) => {
            if (e.key === 'erp_pdf_settings') refresh();
        });

        return () => {
            window.removeEventListener('erp_settings_updated', refresh);
        };
    }, [refresh]);

    const format = useCallback(
        (amount: number, options?: { compact?: boolean; showCode?: boolean }) =>
            formatCurrency(amount, currencyCode, options),
        [currencyCode]
    );

    const convert = useCallback(
        (amount: number, fromCurrency: string) =>
            convertAmount(amount, fromCurrency, currencyCode),
        [currencyCode]
    );

    return {
        currencyCode,
        symbol: getCurrencySymbol(currencyCode),
        currencyName: CURRENCY_NAMES[currencyCode] ?? currencyCode,
        format,
        convert,
        loading,
    };
}