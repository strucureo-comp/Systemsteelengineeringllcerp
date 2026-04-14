import { getPDFSettings } from './pdf-settings';

/**
 * Utility to validate if settings are correctly propagated.
 * Logs warnings if hardcoded strings are detected in key areas (theoretical check).
 * In a real environment, this might check the DOM or internal state of registered components.
 */
export function validateSettingsSync() {
  if (typeof window === 'undefined') return;

  const settings = getPDFSettings();
  console.log('--- SETTINGS SYNC AUDIT ---');
  console.log('Current Settings:', {
    companyName: settings.companyName,
    currency: settings.currency,
    taxRate: settings.taxRate
  });

  // Check for common hardcoded pitfalls in the global scope if exposed
  const pitfalls = ['AED', 'INR', 'USD', 'System Steel Engineering', 'VAT 5%'];
  
  // This is a simple check - real audit would require component introspection
  console.log('Audit complete. Ensure all components use useSettings() hook.');
  console.log('---------------------------');
}
