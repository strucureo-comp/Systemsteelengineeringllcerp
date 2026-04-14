'use client';

import { BOMList } from '../_components/bom-list';

export default function BOMsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Bill of Materials</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Define and manage product structures and components
                </p>
            </div>
            <BOMList />
        </div>
    );
}
