import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise a MongoDB / REST document so that `_id` is always available
 * as `id`. Safe to call on plain objects too.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalize<T extends Record<string, any>>(item: T): T & { id: string } {
  return { ...item, id: (item._id ?? item.id) as string };
}
