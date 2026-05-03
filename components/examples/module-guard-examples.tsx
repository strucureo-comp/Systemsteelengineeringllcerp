/**
 * EXAMPLE: Using Module Guard in Page Components
 * 
 * This shows how to protect pages and conditionally render based on module settings
 */

// ============================================================
// EXAMPLE 1: Protect a Page with ModuleGuard
// ============================================================

// app/(admin)/admin/purchases/purchase-orders/page.tsx
'use client';

import { ModuleGuard } from '@/lib/module-guard';
import PurchaseOrdersList from '@/components/purchases/purchase-orders-list';

export default function PurchaseOrdersPage() {
  return (
    <ModuleGuard moduleName="module_purchase_order">
      <div>
        <h1>Purchase Orders</h1>
        <PurchaseOrdersList />
      </div>
    </ModuleGuard>
  );
}

// ============================================================
// EXAMPLE 2: Sidebar with Conditional Menu Items
// ============================================================

// components/shared/layout/sidebar.tsx
'use client';

import { ModuleConditional, useModuleEnabled } from '@/lib/module-guard';
import { ShoppingCart, FileText, Users, DollarSign, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function Sidebar() {
  const purchaseEnabled = useModuleEnabled('module_purchase_order');
  const salesEnabled = useModuleEnabled('module_sales_invoice');
  const hrEnabled = useModuleEnabled('module_hr_payslip');
  const financeEnabled = useModuleEnabled('module_finance_payment_voucher');
  const reportsEnabled = useModuleEnabled('module_reports_financial');

  return (
    <aside className="w-64 bg-background border-r">
      <nav className="space-y-4 p-4">
        
        {/* Procurement Section - Only if Purchase Order enabled */}
        <ModuleConditional moduleName="module_purchase_order">
          <div>
            <h3 className="font-semibold text-sm mb-2">Procurement</h3>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/admin/purchases/purchase-orders"
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Orders
                </Link>
              </li>
            </ul>
          </div>
        </ModuleConditional>

        {/* Purchase Bill - Only if enabled */}
        <ModuleConditional moduleName="module_purchase_bill_entry">
          <ul className="space-y-1">
            <li>
              <Link 
                href="/admin/purchases/bills"
                className="flex items-center gap-2 p-2 rounded hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                Purchase Bills
              </Link>
            </li>
          </ul>
        </ModuleConditional>

        {/* Sales Section - Only if any sales module enabled */}
        <ModuleConditional moduleName="module_sales_invoice">
          <div>
            <h3 className="font-semibold text-sm mb-2">Sales</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/admin/sales/invoices" className="p-2 block rounded hover:bg-muted">
                  Sales Invoices
                </Link>
              </li>
              <li>
                <Link href="/admin/sales/quotes" className="p-2 block rounded hover:bg-muted">
                  Quotations
                </Link>
              </li>
              <li>
                <Link href="/admin/sales/delivery-notes" className="p-2 block rounded hover:bg-muted">
                  Delivery Notes
                </Link>
              </li>
              <li>
                <Link href="/admin/sales/proforma-invoices" className="p-2 block rounded hover:bg-muted">
                  Proforma Invoices
                </Link>
              </li>
            </ul>
          </div>
        </ModuleConditional>

        {/* HR Section - Only if HR enabled */}
        <ModuleConditional moduleName="module_hr_payslip">
          <div>
            <h3 className="font-semibold text-sm mb-2">Human Resources</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/admin/hr/payslips" className="p-2 block rounded hover:bg-muted">
                  Payslips
                </Link>
              </li>
              <li>
                <Link href="/admin/hr/timesheets" className="p-2 block rounded hover:bg-muted">
                  Timesheets
                </Link>
              </li>
            </ul>
          </div>
        </ModuleConditional>

        {/* Finance Section - Only if Finance enabled */}
        <ModuleConditional moduleName="module_finance_payment_voucher">
          <div>
            <h3 className="font-semibold text-sm mb-2">Finance</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/admin/finance/payment-vouchers" className="p-2 block rounded hover:bg-muted">
                  Payment Vouchers
                </Link>
              </li>
              <li>
                <Link href="/admin/finance/receipt-vouchers" className="p-2 block rounded hover:bg-muted">
                  Receipt Vouchers
                </Link>
              </li>
              <li>
                <Link href="/admin/finance/vat-filing" className="p-2 block rounded hover:bg-muted">
                  VAT Filing
                </Link>
              </li>
              <li>
                <Link href="/admin/finance/corporate-tax" className="p-2 block rounded hover:bg-muted">
                  Corporate Tax
                </Link>
              </li>
            </ul>
          </div>
        </ModuleConditional>

        {/* Reports Section - Only if Reports enabled */}
        <ModuleConditional moduleName="module_reports_financial">
          <div>
            <h3 className="font-semibold text-sm mb-2">Reports</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/admin/reports/financial" className="p-2 block rounded hover:bg-muted">
                  Financial Reports
                </Link>
              </li>
              <li>
                <Link href="/admin/reports/audit" className="p-2 block rounded hover:bg-muted">
                  Audit Reports
                </Link>
              </li>
            </ul>
          </div>
        </ModuleConditional>
      </nav>
    </aside>
  );
}

// ============================================================
// EXAMPLE 3: Conditional Dashboard Widgets
// ============================================================

// components/admin/dashboard.tsx
'use client';

import { ModuleConditional } from '@/lib/module-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Show Purchase Order widget only if enabled */}
      <ModuleConditional moduleName="module_purchase_order">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Purchase order stats */}
          </CardContent>
        </Card>
      </ModuleConditional>

      {/* Show Sales Invoice widget only if enabled */}
      <ModuleConditional moduleName="module_sales_invoice">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Invoice stats */}
          </CardContent>
        </Card>
      </ModuleConditional>

      {/* Show Payslip widget only if enabled */}
      <ModuleConditional moduleName="module_hr_payslip">
        <Card>
          <CardHeader>
            <CardTitle>Pending Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Payslip stats */}
          </CardContent>
        </Card>
      </ModuleConditional>

      {/* Show Finance widget only if enabled */}
      <ModuleConditional moduleName="module_finance_payment_voucher">
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Payment stats */}
          </CardContent>
        </Card>
      </ModuleConditional>

    </div>
  );
}

// ============================================================
// EXAMPLE 4: Using useModuleEnabled Hook in Component
// ============================================================

// components/operations/quick-actions.tsx
'use client';

import { useModuleEnabled } from '@/lib/module-guard';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const canCreatePO = useModuleEnabled('module_purchase_order');
  const canCreateInvoice = useModuleEnabled('module_sales_invoice');
  const canCreatePayslip = useModuleEnabled('module_hr_payslip');

  return (
    <div className="flex gap-2">
      {canCreatePO && (
        <Button>Create Purchase Order</Button>
      )}
      {canCreateInvoice && (
        <Button>Create Invoice</Button>
      )}
      {canCreatePayslip && (
        <Button>Create Payslip</Button>
      )}
    </div>
  );
}

// ============================================================
// SUMMARY: Module Checking Pattern
// ============================================================

/*
PROTECTED PAGE:
  Use ModuleGuard wrapper to prevent access

  <ModuleGuard moduleName="module_purchase_order">
    <YourPageComponent />
  </ModuleGuard>

CONDITIONAL RENDERING:
  Use ModuleConditional for UI elements
  
  <ModuleConditional moduleName="module_sales_invoice">
    <SalesInvoiceWidget />
  </ModuleConditional>

CUSTOM LOGIC:
  Use useModuleEnabled hook
  
  const isEnabled = useModuleEnabled('module_purchase_order');
  if (isEnabled) { /* show something */ }

SIDEBAR/MENU:
  Wrap each menu section with ModuleConditional
  User only sees enabled modules
*/
