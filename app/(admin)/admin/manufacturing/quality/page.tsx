'use client';

import { QualityInspectionList } from '../_components/quality-inspection-list';

export default function QualityPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Quality Inspection</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Monitor production quality and perform inspections
                </p>
            </div>
            <QualityInspectionList />
        </div>
    );
}
