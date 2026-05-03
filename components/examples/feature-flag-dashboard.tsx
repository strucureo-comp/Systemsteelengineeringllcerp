'use client';

/**
 * EXAMPLE: Dynamic Dashboard Using Feature Flags from Settings
 * 
 * This demonstrates:
 * - Conditional rendering based on feature flags
 * - Dynamic widget visibility
 * - Settings-driven UI configuration
 */

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BarChart3, CheckCircle2, Shield, Inbox } from 'lucide-react';

export function FeatureFlagDashboard() {
  const { getSetting, loading } = useSettings();
  const [features, setFeatures] = useState({
    twoFactor: false,
    advancedReports: false,
    approvalEngine: false,
    inventoryTracking: false
  });

  useEffect(() => {
    if (!loading) {
      setFeatures({
        twoFactor: getSetting('feature_two_factor', false),
        advancedReports: getSetting('feature_advanced_reports', false),
        approvalEngine: getSetting('feature_approval_engine', false),
        inventoryTracking: getSetting('feature_inventory_tracking', false)
      });
    }
  }, [loading, getSetting]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2FA Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Two-Factor Auth</CardTitle>
            {features.twoFactor ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{features.twoFactor ? 'Enabled' : 'Disabled'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {features.twoFactor
                ? 'All users required to use 2FA'
                : 'Enable to require 2FA for enhanced security'}
            </p>
          </CardContent>
        </Card>

        {/* Advanced Reports Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Advanced Reports</CardTitle>
            {features.advancedReports ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{features.advancedReports ? 'Enabled' : 'Disabled'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {features.advancedReports
                ? 'Advanced analytics available'
                : 'Enable for advanced reporting tools'}
            </p>
          </CardContent>
        </Card>

        {/* Approval Engine Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approval Workflows</CardTitle>
            {features.approvalEngine ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{features.approvalEngine ? 'Enabled' : 'Disabled'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {features.approvalEngine
                ? 'Document approval workflows active'
                : 'Enable to use approval workflows'}
            </p>
          </CardContent>
        </Card>

        {/* Inventory Tracking Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Tracking</CardTitle>
            {features.inventoryTracking ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{features.inventoryTracking ? 'Enabled' : 'Disabled'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {features.inventoryTracking
                ? 'Real-time inventory available'
                : 'Enable for inventory management'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Feature Sections */}
      <Tabs defaultValue="core" className="w-full">
        <TabsList>
          <TabsTrigger value="core">Core Features</TabsTrigger>
          {features.advancedReports && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {features.approvalEngine && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
          {features.inventoryTracking && <TabsTrigger value="inventory">Inventory</TabsTrigger>}
        </TabsList>

        {/* Core Features (Always Available) */}
        <TabsContent value="core">
          <Card>
            <CardHeader>
              <CardTitle>Core Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-semibold">Finance</p>
                  <p className="text-sm text-muted-foreground">Accounting & invoicing</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-semibold">Sales</p>
                  <p className="text-sm text-muted-foreground">Orders & quotations</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-semibold">Procurement</p>
                  <p className="text-sm text-muted-foreground">Purchasing & vendors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Reports - Only if Enabled */}
        {features.advancedReports && (
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Advanced Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded">
                  <p className="text-sm">
                    <strong>Custom Reports</strong> - Build complex financial reports with custom date ranges and filters
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded">
                  <p className="text-sm">
                    <strong>Data Visualization</strong> - Interactive charts, graphs, and dashboards
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded">
                  <p className="text-sm">
                    <strong>Export & Scheduling</strong> - Export reports to PDF/Excel or schedule automatic delivery
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Approval Engine - Only if Enabled */}
        {features.approvalEngine && (
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  Workflow Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded">
                  <p className="text-sm">
                    <strong>Document Approvals</strong> - Route invoices, POs, and contracts through approval chains
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded">
                  <p className="text-sm">
                    <strong>Approval Rules</strong> - Define custom approval rules based on amount, department, or document type
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded">
                  <p className="text-sm">
                    <strong>Audit Trail</strong> - Full history of approvals with timestamps and comments
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Inventory Tracking - Only if Enabled */}
        {features.inventoryTracking && (
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Inventory Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded">
                  <p className="text-sm">
                    <strong>Stock Levels</strong> - Real-time inventory tracking across multiple warehouses
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded">
                  <p className="text-sm">
                    <strong>Low Stock Alerts</strong> - Automatic notifications for items below reorder point
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded">
                  <p className="text-sm">
                    <strong>Movement History</strong> - Track item movements, adjustments, and transfers
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
