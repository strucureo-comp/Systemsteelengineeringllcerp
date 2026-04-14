'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Factory,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const reportCategories = [
    {
      id: 'financial',
      title: 'Financial Reports',
      icon: DollarSign,
      description: 'P&L, Balance Sheet, Cash Flow, Financial Ratios',
      reports: [
        { name: 'Profit & Loss Statement', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Balance Sheet', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Cash Flow Statement', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Financial Ratios Analysis', path: '/admin/finance/reports', frequency: 'Quarterly' },
        { name: 'Budget vs Actual', path: '/admin/finance/reports', frequency: 'Monthly' }
      ],
      color: 'bg-green-500'
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Reports',
      icon: Factory,
      description: 'Production, Quality, Efficiency, OEE Analytics',
      reports: [
        { name: 'Production Performance', path: '/admin/manufacturing', frequency: 'Weekly' },
        { name: 'Quality Metrics', path: '/admin/manufacturing', frequency: 'Weekly' },
        { name: 'OEE Analysis', path: '/admin/manufacturing', frequency: 'Daily' },
        { name: 'Scrap & Waste Report', path: '/admin/manufacturing', frequency: 'Weekly' },
        { name: 'Work Center Utilization', path: '/admin/manufacturing', frequency: 'Monthly' }
      ],
      color: 'bg-blue-500'
    },
    {
      id: 'hr',
      title: 'HR Reports',
      icon: Users,
      description: 'Payroll, Attendance, Workforce Analytics',
      reports: [
        { name: 'Payroll Summary', path: '/admin/hr', frequency: 'Monthly' },
        { name: 'Attendance Report', path: '/admin/hr', frequency: 'Monthly' },
        { name: 'Workforce Analytics', path: '/admin/hr', frequency: 'Quarterly' },
        { name: 'Turnover Analysis', path: '/admin/hr', frequency: 'Quarterly' },
        { name: 'Leave Balance Report', path: '/admin/hr', frequency: 'Monthly' }
      ],
      color: 'bg-purple-500'
    },
    {
      id: 'sales',
      title: 'Sales Reports',
      icon: TrendingUp,
      description: 'Sales Analytics, Pipeline, Customer Insights',
      reports: [
        { name: 'Sales Performance', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Sales Pipeline', path: '/admin/finance/reports', frequency: 'Weekly' },
        { name: 'Customer Analytics', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Product Performance', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Sales Forecast', path: '/admin/finance/reports', frequency: 'Quarterly' }
      ],
      color: 'bg-orange-500'
    },
    {
      id: 'inventory',
      title: 'Inventory Reports',
      icon: Package,
      description: 'Stock Valuation, Movements, ABC Analysis',
      reports: [
        { name: 'Inventory Valuation', path: '/admin/finance/reports', frequency: 'Monthly' },
        { name: 'Stock Movement Report', path: '/admin/finance/reports', frequency: 'Weekly' },
        { name: 'ABC Analysis', path: '/admin/finance/reports', frequency: 'Quarterly' },
        { name: 'Reorder Level Report', path: '/admin/finance/reports', frequency: 'Weekly' },
        { name: 'Dead Stock Analysis', path: '/admin/finance/reports', frequency: 'Monthly' }
      ],
      color: 'bg-yellow-500'
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive reporting across all ERP modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Report
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Reports</p>
                <p className="text-2xl font-bold mt-1">25</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Scheduled</p>
                <p className="text-2xl font-bold mt-1">8</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Generated Today</p>
                <p className="text-2xl font-bold mt-1">12</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Exports</p>
                <p className="text-2xl font-bold mt-1">45</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Download className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 border h-10 p-1">
          <TabsTrigger value="overview" className="text-xs font-semibold">Overview</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs font-semibold">Financial</TabsTrigger>
          <TabsTrigger value="manufacturing" className="text-xs font-semibold">Manufacturing</TabsTrigger>
          <TabsTrigger value="hr" className="text-xs font-semibold">HR</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs font-semibold">Sales</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs font-semibold">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {reportCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{category.title}</CardTitle>
                          <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8"
                        onClick={() => setActiveTab(category.id)}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.reports.slice(0, 3).map((report, idx) => (
                        <Link 
                          key={idx} 
                          href={report.path}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm group-hover:text-primary transition-colors">{report.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{report.frequency}</span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {reportCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-lg ${category.color} flex items-center justify-center`}>
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report, idx) => (
                    <Link
                      key={idx}
                      href={report.path}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{report.name}</p>
                          <p className="text-xs text-muted-foreground">Generated {report.frequency.toLowerCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 gap-2">
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm" className="h-8">
                          View
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
