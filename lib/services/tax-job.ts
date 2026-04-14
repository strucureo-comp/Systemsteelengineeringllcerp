/**
 * Scheduled Tax Data Collection Job
 * Runs every 10 days (3 times per month) to keep tax database updated
 * Can be triggered via API or integrated with cron service
 */

import { taxDataService } from '@/lib/services/tax-data-service';
import { prisma } from '@/lib/prisma';

interface JobResult {
  timestamp: string;
  status: 'success' | 'failed';
  countriesCollected: number;
  errors: number;
  message: string;
  executionTimeMs: number;
}

/**
 * Main tax data collection job
 */
export async function runTaxDataCollectionJob(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('[TAX JOB] Starting periodic tax data collection (3x monthly cycle)...');

  try {
    // Check if collection is needed
    const shouldCollect = await taxDataService.shouldCollectTaxData();

    if (!shouldCollect) {
      const lastSync = await taxDataService.getLastSyncTime();
      console.log(`[TAX JOB] Collection not needed yet. Last sync: ${lastSync}`);

      return {
        timestamp: new Date().toISOString(),
        status: 'success',
        countriesCollected: 0,
        errors: 0,
        message: 'Collection not needed yet (periodic cycle)',
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Collect tax data
    const result = await taxDataService.collectAllCountriesTaxData();

    if (!result) {
      throw new Error('Collection returned null');
    }

    // Store job result in system settings
    await storeJobResult({
      timestamp: new Date().toISOString(),
      status: result.status === 'success' ? 'success' : 'failed',
      countriesCollected: result.data.length,
      errors: result.status === 'failed' ? result.all_countries.length : 0,
      message: result.error_message || `Collected tax data for ${result.data.length} countries`,
      executionTimeMs: Date.now() - startTime,
    });

    console.log(
      `[TAX JOB] Collection completed: ${result.data.length} countries, Status: ${result.status}`
    );

    return {
      timestamp: new Date().toISOString(),
      status: 'success',
      countriesCollected: result.data.length,
      errors: result.status === 'success' ? 0 : (result.all_countries.length - result.data.length),
      message: `Successfully collected tax data for ${result.data.length} countries`,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[TAX JOB] Error during collection:', error);

    const jobResult: JobResult = {
      timestamp: new Date().toISOString(),
      status: 'failed',
      countriesCollected: 0,
      errors: 1,
      message: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    };

    await storeJobResult(jobResult);

    return jobResult;
  }
}

/**
 * Store job execution result in database
 */
async function storeJobResult(result: JobResult): Promise<void> {
  if (!prisma) {
    console.warn('[TAX JOB] Prisma not initialized');
    return;
  }

  try {
    // Get existing job history or create new
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: 'tax_collection_job_history' },
    });

    const history = existingSetting
      ? (existingSetting.value as unknown as JobResult[])
      : [];

    // Keep last 12 job results
    const updatedHistory = [result, ...history].slice(0, 12);

    await prisma.systemSettings.upsert({
      where: { key: 'tax_collection_job_history' },
      update: {
        value: updatedHistory,
        updated_at: new Date(),
      },
      create: {
        key: 'tax_collection_job_history',
        value: updatedHistory,
      },
    });

    console.log('[TAX JOB] Job result stored in database');
  } catch (error) {
    console.error('[TAX JOB] Error storing job result:', error);
  }
}

/**
 * Get job execution history
 */
export async function getJobHistory(): Promise<JobResult[]> {
  if (!prisma) {
    console.warn('[TAX JOB] Prisma not initialized');
    return [];
  }

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'tax_collection_job_history' },
    });

    return setting ? (setting.value as unknown as JobResult[]) : [];
  } catch (error) {
    console.error('[TAX JOB] Error retrieving job history:', error);
    return [];
  }
}

/**
 * Manual job trigger endpoint helper
 */
export async function triggerManualCollection(): Promise<JobResult> {
  console.log('[TAX JOB] Manual collection triggered');
  return runTaxDataCollectionJob();
}
