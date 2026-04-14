// Manufacturing API Client
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

function authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// WORK CENTERS
// ══════════════════════════════════════════════════════════════════════════════

export async function getWorkCenters(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-centers`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getWorkCenters error:', e); }
    return [];
}

export async function createWorkCenter(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-centers`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createWorkCenter error:', e); }
    return null;
}

export async function updateWorkCenter(id: string, data: any): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-centers/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) { console.warn('[API] updateWorkCenter error:', e); }
    return false;
}

export async function deleteWorkCenter(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-centers/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.ok;
    } catch (e) { console.warn('[API] deleteWorkCenter error:', e); }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// BILL OF MATERIALS (BOM)
// ══════════════════════════════════════════════════════════════════════════════

export async function getBOMs(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/boms`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getBOMs error:', e); }
    return [];
}

export async function getBOM(id: string): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/boms/${id}`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getBOM error:', e); }
    return null;
}

export async function createBOM(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/boms`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createBOM error:', e); }
    return null;
}

export async function updateBOM(id: string, data: any): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/boms/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) { console.warn('[API] updateBOM error:', e); }
    return false;
}

export async function deleteBOM(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/boms/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        return res.ok;
    } catch (e) { console.warn('[API] deleteBOM error:', e); }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION ORDERS
// ══════════════════════════════════════════════════════════════════════════════

export async function getProductionOrders(status?: string): Promise<any[]> {
    try {
        const url = status 
            ? `${API_BASE}/manufacturing/production-orders?status=${status}`
            : `${API_BASE}/manufacturing/production-orders`;
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getProductionOrders error:', e); }
    return [];
}

export async function getProductionOrder(id: string): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/production-orders/${id}`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getProductionOrder error:', e); }
    return null;
}

export async function createProductionOrder(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/production-orders`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createProductionOrder error:', e); }
    return null;
}

export async function updateProductionOrder(id: string, data: any): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/production-orders/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) { console.warn('[API] updateProductionOrder error:', e); }
    return false;
}

export async function startProductionOrder(id: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/production-orders/${id}/start`, {
            method: 'POST',
            headers: authHeaders()
        });
        return res.ok;
    } catch (e) { console.warn('[API] startProductionOrder error:', e); }
    return false;
}

export async function completeProductionOrder(id: string, quantityProduced: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/production-orders/${id}/complete`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ quantity_produced: quantityProduced })
        });
        return res.ok;
    } catch (e) { console.warn('[API] completeProductionOrder error:', e); }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// WORK ORDERS
// ══════════════════════════════════════════════════════════════════════════════

export async function getWorkOrders(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-orders`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getWorkOrders error:', e); }
    return [];
}

export async function createWorkOrder(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-orders`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createWorkOrder error:', e); }
    return null;
}

export async function logWorkOrderTime(id: string, timeLog: any): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/work-orders/${id}/log-time`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(timeLog)
        });
        return res.ok;
    } catch (e) { console.warn('[API] logWorkOrderTime error:', e); }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY INSPECTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getQualityInspections(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/quality-inspections`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getQualityInspections error:', e); }
    return [];
}

export async function createQualityInspection(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/quality-inspections`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createQualityInspection error:', e); }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MATERIAL ISSUES
// ══════════════════════════════════════════════════════════════════════════════

export async function getMaterialIssues(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/material-issues`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getMaterialIssues error:', e); }
    return [];
}

export async function createMaterialIssue(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/material-issues`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createMaterialIssue error:', e); }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION SCRAP
// ══════════════════════════════════════════════════════════════════════════════

export async function getProductionScrap(): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/scrap`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getProductionScrap error:', e); }
    return [];
}

export async function createProductionScrap(data: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/scrap`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data)
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] createProductionScrap error:', e); }
    return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export async function getManufacturingDashboard(): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/dashboard`, { headers: authHeaders() });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] getManufacturingDashboard error:', e); }
    return null;
}


// ══════════════════════════════════════════════════════════════════════════════
// ADVANCED ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

export async function calculateMaterialRequirements(bomId: string, quantity: number, warehouseId: string): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/mrp/calculate`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ bom_id: bomId, quantity, warehouse_id: warehouseId })
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateMaterialRequirements error:', e); }
    return null;
}

export async function generatePurchaseRequisitions(materialRequirements: any): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/mrp/generate-requisitions`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ material_requirements: materialRequirements })
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] generatePurchaseRequisitions error:', e); }
    return null;
}

export async function calculateOEE(workCenterId: string, startDate: string, endDate: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/oee?work_center_id=${workCenterId}&start_date=${startDate}&end_date=${endDate}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateOEE error:', e); }
    return null;
}

export async function calculateProductionEfficiency(startDate: string, endDate: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/efficiency?start_date=${startDate}&end_date=${endDate}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateProductionEfficiency error:', e); }
    return null;
}

export async function calculateCostVariance(productionOrderId: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/cost-variance/${productionOrderId}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateCostVariance error:', e); }
    return null;
}

export async function calculateProductionLeadTime(bomId: string, quantity: number): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/manufacturing/analytics/lead-time`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ bom_id: bomId, quantity })
        });
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateProductionLeadTime error:', e); }
    return null;
}

export async function suggestProductionSchedule(startDate: string, endDate: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/schedule-suggestion?start_date=${startDate}&end_date=${endDate}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] suggestProductionSchedule error:', e); }
    return null;
}

export async function calculateQualityMetrics(startDate: string, endDate: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/quality?start_date=${startDate}&end_date=${endDate}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] calculateQualityMetrics error:', e); }
    return null;
}

export async function analyzeScrap(startDate: string, endDate: string): Promise<any> {
    try {
        const res = await fetch(
            `${API_BASE}/manufacturing/analytics/scrap?start_date=${startDate}&end_date=${endDate}`,
            { headers: authHeaders() }
        );
        if (res.ok) return res.json();
    } catch (e) { console.warn('[API] analyzeScrap error:', e); }
    return null;
}
