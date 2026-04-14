'use client';

import { ProductionOrdersList } from '../_components/production-orders-list';

export default function ProductionOrdersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Production Orders</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage and track production orders in real-time
                </p>
            </div>
            <ProductionOrdersList />
        </div>
    );
}
