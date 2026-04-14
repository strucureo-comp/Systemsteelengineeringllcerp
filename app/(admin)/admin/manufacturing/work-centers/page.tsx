'use client';

import { WorkCenterList } from '../_components/work-center-list';

export default function WorkCentersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Work Centers</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage production facilities and labor resources
                </p>
            </div>
            <WorkCenterList />
        </div>
    );
}
