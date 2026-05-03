import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesEnquiriesRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/crm/enquiries');
    }, [router]);

    return null;
}