'use client';

import { AnalyticsDashboard } from '../_components/analytics-dashboard';

export default function ManufacturingAnalyticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Manufacturing Analytics</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Advanced production analytics and performance insights
                </p>
            </div>
            <AnalyticsDashboard />
        </div>
    );
}
