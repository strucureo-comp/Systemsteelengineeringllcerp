/**
 * Subscription Plans Seed Data
 * 
 * These are the default plans that will be created when the system is first set up.
 * Based on the spec:
 * - Trial / Monthly / Yearly
 * - Feature-based access (HR only, Finance only, Full ERP)
 */

export const SUBSCRIPTION_PLANS = [
    {
        name: 'Starter',
        code: 'starter',
        description: 'Finance & basic reporting for small businesses',
        price_monthly: 49,
        price_yearly: 470,  // ~20% discount
        trial_days: 14,
        max_users: 3,
        module_finance: true,
        module_sales: false,
        module_operations: false,
        module_hr: false,
        module_reports: true,
    },
    {
        name: 'Professional',
        code: 'professional',
        description: 'Finance, Sales & Operations for growing businesses',
        price_monthly: 149,
        price_yearly: 1430, // ~20% discount
        trial_days: 14,
        max_users: 15,
        module_finance: true,
        module_sales: true,
        module_operations: true,
        module_hr: false,
        module_reports: true,
    },
    {
        name: 'Enterprise',
        code: 'enterprise',
        description: 'Full ERP suite with all modules and unlimited users',
        price_monthly: 299,
        price_yearly: 2870, // ~20% discount
        trial_days: 30,
        max_users: -1, // Unlimited
        module_finance: true,
        module_sales: true,
        module_operations: true,
        module_hr: true,
        module_reports: true,
    },
] as const;

/**
 * Business Types (for company setup)
 */
export const BUSINESS_TYPES = [
    { value: 'service', label: 'Service Business', description: 'Projects, consulting, professional services' },
    { value: 'trading', label: 'Trading', description: 'Buy and sell goods, import/export' },
    { value: 'manufacturing', label: 'Manufacturing', description: 'Produce goods from raw materials' },
    { value: 'hybrid', label: 'Hybrid', description: 'Combination of service, trading, and/or manufacturing' },
] as const;

/**
 * Tax Regimes by Country
 */
export const TAX_REGIMES: Record<string, { label: string; components: string[] }> = {
    'VAT': { label: 'Value Added Tax (VAT)', components: ['VAT'] },
    'GST': { label: 'Goods & Services Tax (GST)', components: ['CGST', 'SGST', 'IGST'] },
    'SALES_TAX': { label: 'Sales Tax', components: ['Sales Tax'] },
    'GST_VAT': { label: 'GST + VAT', components: ['GST', 'VAT'] },
};

/**
 * Statutory components by country
 */
export const STATUTORY_BY_COUNTRY: Record<string, string[]> = {
    'AE': ['VAT'],
    'IN': ['GST', 'TDS', 'PF', 'ESI'],
    'SA': ['VAT'],
    'US': ['Sales Tax', 'Federal Tax', 'State Tax'],
    'GB': ['VAT', 'NIC', 'PAYE'],
};

/**
 * Module label mapping for UI
 */
export const MODULE_LABELS: Record<string, { label: string; description: string; icon: string }> = {
    finance: { label: 'Finance', description: 'Accounting, receivables, payables, banking, tax', icon: 'DollarSign' },
    sales: { label: 'Sales', description: 'Leads, quotations, orders, invoicing', icon: 'ShoppingCart' },
    operations: { label: 'Operations', description: 'Projects, procurement, inventory, manufacturing', icon: 'Cog' },
    hr: { label: 'Human Resources', description: 'Employees, attendance, payroll, HR events', icon: 'Users' },
    reports: { label: 'Reports', description: 'Financial reports, analytics, CEO dashboard', icon: 'BarChart3' },
};
