import { getServerSession } from '@/lib/auth/session';

export async function getSession() {
    return getServerSession();
}

export async function getCurrentUser() {
    const session = await getServerSession();
    return session?.user || null;
}
