
const BASE_URL = 'http://localhost:4000/api';
let TOKEN = '';

async function login() {
    console.log('Logging in...');
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@systemsteel.com', password: 'password123' })
    });
    const data = await res.json();
    if (data.token) {
        TOKEN = data.token;
        console.log('Login successful.');
    } else {
        console.error('Login failed:', data);
        process.exit(1);
    }
}

async function api(path, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();
    return { status: res.status, data };
}

async function runTests() {
    await login();

    console.log('\n--- 1. Settings (Roles) ---');
    const roleRes = await api('/settings/roles', 'POST', {
        name: 'Test Manager',
        description: 'Test Manager Role',
        permissions: {
            finance: { view: true, create: true },
            sales: { view: true, create: true }
        }
    });
    console.log('Create Role:', roleRes.status, roleRes.data.error || 'Success');

    console.log('\n--- 2. Approvals (Workflows) ---');
    const workflowRes = await api('/workflows', 'POST', {
        title: 'Sales Approval Workflow',
        status: 'active',
        threshold: 1000,
        flow: [
            { step: 1, role: 'Manager', action: 'approve' }
        ]
    });
    console.log('Create Workflow:', workflowRes.status, workflowRes.data.error || 'Success');

    console.log('\n--- 3. Finance (Balanced Journal) ---');
    // We need account IDs/codes. Assuming 1000 (Cash) and 4000 (Revenue) exist or we use common codes.
    const journalRes = await api('/finance/journals', 'POST', {
        date: new Date().toISOString(),
        description: 'Test Balanced Journal',
        lines: [
            { account_code: '1000', debit: 100, credit: 0, description: 'Cash In' },
            { account_code: '4000', debit: 0, credit: 100, description: 'Revenue' }
        ],
        status: 'draft'
    });
    console.log('Create Journal:', journalRes.status, journalRes.data.error || 'Success');

    console.log('\n--- 4. Tax Center ---');
    const jurRes = await api('/tax-center/jurisdictions', 'POST', {
        code: 'DXB-VAT',
        country: 'UAE',
        system: 'vat',
        reportingPeriod: 'quarterly'
    });
    console.log('Create Jurisdiction:', jurRes.status, jurRes.data.error || 'Success');

    const taxCodeRes = await api('/tax-center/codes', 'POST', {
        code: 'VAT-5',
        description: '5% Standard VAT',
        jurisdiction: 'DXB-VAT',
        type: 'output',
        rate: 5,
        status: 'active'
    });
    console.log('Create Tax Code:', taxCodeRes.status, taxCodeRes.data.error || 'Success');

    console.log('\n--- 5. HRMS (Employee) ---');
    const empRes = await api('/hrms/employees', 'POST', {
        employee_id: 'EMP' + Date.now(),
        name: 'John Doe',
        email: 'john' + Date.now() + '@example.com',
        status: 'active',
        joining_date: new Date().toISOString()
    });
    console.log('Create Employee:', empRes.status, empRes.data.error || 'Success');

    console.log('\n--- 6. Sales (Quotation) ---');
    const quoteRes = await api('/sales-documents/quotations', 'POST', {
        number: 'QT-' + Date.now(),
        customerName: 'Test Customer',
        date: new Date().toISOString().split('T')[0],
        items: [
            { description: 'Test Product', quantity: 2, unitPrice: 500, total: 1000 }
        ],
        subtotal: 1000,
        taxRate: 5,
        taxAmount: 50,
        total: 1050
    });
    console.log('Create Quotation:', quoteRes.status, quoteRes.data.error || 'Success');

    console.log('\n--- 7. Procurement (PO) ---');
    const poRes = await api('/procurement', 'POST', {
        order_number: 'PO-' + Date.now(),
        vendor_name: 'Test Vendor',
        order_date: new Date().toISOString(),
        items: [
            { description: 'Raw Material A', quantity: 100, unit_price: 10, total_price: 1000 }
        ],
        total_amount: 1000,
        status: 'draft'
    });
    console.log('Create PO:', poRes.status, poRes.data.error || 'Success');

    console.log('\n--- 8. Manufacturing (BOM) ---');
    // Need item IDs. We'll create a Finished Good and a Raw Material first.
    const itemFG = await api('/inventory', 'POST', {
        sku: 'FG-' + Date.now(),
        name: 'Finished Good',
        category: 'finished-goods',
        unit: 'pcs'
    });
    const itemRM = await api('/inventory', 'POST', {
        sku: 'RM-' + Date.now(),
        name: 'Raw Material',
        category: 'raw-materials',
        unit: 'pcs'
    });

    if (itemFG.data && itemRM.data) {
        const bomRes = await api('/manufacturing/boms', 'POST', {
            code: 'BOM-' + Date.now(),
            product_id: itemFG.data._id,
            product_name: 'Finished Good',
            components: [
                {
                    item_id: itemRM.data._id,
                    item_name: 'Raw Material',
                    quantity: 2,
                    unit_cost: 10,
                    total_cost: 20
                }
            ],
            labor_cost: 5,
            total_cost: 20,
            total_manufacturing_cost: 25
        });
        console.log('Create BOM:', bomRes.status, bomRes.data.error || 'Success');
    } else {
        console.log('Skipping BOM test due to item creation failure.');
    }

    console.log('\n--- Tests Completed ---');
}

runTests();
