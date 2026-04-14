/**
 * Tax Data Auto-Collection Initializer
 * Runs at server startup and sets up periodic collection
 * Configured to run 3 times per month (every 10 days)
 */

import { taxDataService } from '@/lib/services/tax-data-service';
import { runTaxDataCollectionJob } from '@/lib/services/tax-job';

let collectionInterval: NodeJS.Timeout | null = null;

/**
 * Initialize tax data collection at server startup
 * This will:
 * 1. Check if collection is needed (every 10 days)
 * 2. Run auto-collection if interval has passed
 * 3. Start periodic checks
 */
export async function initializeTaxDataCollection(): Promise<void> {
  console.log('[TAX INIT] Starting tax data collection initialization...');

  try {
    // Check if API key is configured
    if (!process.env.APILAYER_API_KEY || process.env.APILAYER_API_KEY === 'your_api_key_here') {
      console.warn('[TAX INIT] ⚠️  APILAYER_API_KEY not configured in environment');
      console.warn('[TAX INIT] Tax data collection disabled. Please add APILAYER_API_KEY to .env.local');
      return;
    }

    // Check if auto-collection is enabled
    const autoCollectEnabled = process.env.TAX_AUTO_COLLECT_STARTUP !== 'false';
    
    if (autoCollectEnabled) {
      console.log('[TAX INIT] Auto-collection enabled. Checking if collection is needed...');
      
      // Check if collection is needed
      const shouldCollect = await taxDataService.shouldCollectTaxData();
      
      if (shouldCollect) {
        console.log('[TAX INIT] Collection interval reached. Starting collection...');
        const result = await runTaxDataCollectionJob();
        console.log('[TAX INIT] Collection result:', result.status);
      } else {
        const lastSync = await taxDataService.getLastSyncTime();
        console.log(`[TAX INIT] ✅ Collection not needed yet. Last sync: ${lastSync}`);
      }
    }

    // Set up periodic check every 1 hour
    // This will trigger collection if needed (currently every 10 days)
    const checkInterval = 60 * 60 * 1000; // 1 hour
    
    collectionInterval = setInterval(async () => {
      try {
        const shouldCollect = await taxDataService.shouldCollectTaxData();
        
        if (shouldCollect) {
          console.log('[TAX PERIODIC] Collection interval reached. Starting collection...');
          const result = await runTaxDataCollectionJob();
          console.log('[TAX PERIODIC] Collection completed:', result.status);
        }
      } catch (error) {
        console.error('[TAX PERIODIC] Error in periodic check:', error);
      }
    }, checkInterval);

    console.log('[TAX INIT] ✅ Tax data collection initialized successfully');
    console.log('[TAX INIT] Periodic checks configured to run every 1 hour');
    console.log('[TAX INIT] Collection will run when 10-day interval is reached (3x per month)');
  } catch (error) {
    console.error('[TAX INIT] ❌ Failed to initialize tax data collection:', error);
  }
}

/**
 * Cleanup function to stop periodic collection checks
 * Call this when shutting down the server
 */
export function stopTaxDataCollection(): void {
  if (collectionInterval) {
    clearInterval(collectionInterval);
    console.log('[TAX CLEANUP] Tax data collection stopped');
  }
}

/**
 * Get current collection status
 */
export async function getTaxCollectionStatus(): Promise<{
  enabled: boolean;
  lastSync: Date | null;
  shouldCollect: boolean;
  nextCollectionDue: string;
}> {
  const lastSync = await taxDataService.getLastSyncTime();
  const shouldCollect = await taxDataService.shouldCollectTaxData();
  
  let nextDue = 'Unknown';
  if (lastSync) {
    const nextCollectionDate = new Date(lastSync);
    nextCollectionDate.setDate(nextCollectionDate.getDate() + 10);
    // Format as: "February 12, 2026"
    nextDue = nextCollectionDate.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return {
    enabled: !!process.env.APILAYER_API_KEY && process.env.APILAYER_API_KEY !== 'your_api_key_here',
    lastSync,
    shouldCollect,
    nextCollectionDue: nextDue,
  };
}

export default {
  initializeTaxDataCollection,
  stopTaxDataCollection,
  getTaxCollectionStatus,
};
