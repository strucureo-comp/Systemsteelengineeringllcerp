
const BASE_URL = 'http://127.0.0.1:4000/api';
let TOKEN = '';

async function login() {
    console.log('Logging in as admin...');
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
    
    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        data = await res.json();
    } else {
        const text = await res.text();
        data = { error: 'Non-JSON response', text: text.substring(0, 200) };
    }
    
    return { status: res.status, data };
}

async function runTests() {
    await login();

    const results = {};

    console.log('\n--- 1. Settings (Roles) ---');
    const rolePayload = {
        name: 'Test Manager ' + Date.now(),
        description: 'Test Manager Role with permissions array',
        permissions: [
            { module: "finance", view: true, create: true, edit: true },
            { module: "procurement", view: true, create: true, edit: true },
            { module: "inventory", view: true, create: true, edit: true }
        ]
    };
    const roleRes = await api('/settings/roles', 'POST', rolePayload);
    console.log('Create Role:', roleRes.status, roleRes.data.error || 'Success');
    results.settings_roles = roleRes.status === 201 || roleRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 2. Approval Engine (Workflows) ---');
    const workflowPayload = {
        name: 'PO Approval Workflow ' + Date.now(),
        module: 'procurement',
        document_type: 'purchase_order',
        steps: [
            { 
                step_number: 1, 
                name: 'Manager Approval', 
                approver_type: 'role', 
                approver_role: 'Manager' 
            }
        ],
        is_active: true
    };
    
    const workflowRes = await api('/workflows', 'POST', workflowPayload);
    console.log('Create Workflow:', workflowRes.status, workflowRes.data.error || 'Success');
    results.approvals = (workflowRes.status === 201 || workflowRes.status === 200) ? 'PASS' : 'FAIL';

    console.log('\n--- 3. Finance (Balanced Journal) ---');
    // Ensure accounts exist or create them
    const accounts = [
        { code: '1000', name: 'Cash', type: 'asset', group: 'Current Assets' },
        { code: '4000', name: 'Sales Revenue', type: 'revenue', group: 'Revenue' }
    ];
    for (const acc of accounts) {
        await api('/finance/accounts', 'POST', acc);
    }

    const journalPayload = {
        date: new Date().toISOString(),
        description: 'Balanced Test Journal',
        lines: [
            { account_code: '1000', debit: 100, credit: 0, description: 'Debit Cash' },
            { account_code: '4000', debit: 0, credit: 100, description: 'Credit Revenue' }
        ],
        status: 'draft'
    };
    const journalRes = await api('/finance/journals', 'POST', journalPayload);
    console.log('Create Journal:', journalRes.status, journalRes.data.error || 'Success');
    results.finance = journalRes.status === 201 || journalRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 4. Tax Center ---');
    const jurRes = await api('/tax-center/jurisdictions', 'POST', {
        code: 'TEST-VAT',
        country: 'TestLand',
        system: 'vat',
        reportingPeriod: 'quarterly'
    });
    const taxCodeRes = await api('/tax-center/codes', 'POST', {
        code: 'TVAT-5',
        description: '5% Test VAT',
        jurisdiction: 'TEST-VAT',
        type: 'output',
        rate: 5,
        status: 'active'
    });
    console.log('Create Tax Code:', taxCodeRes.status, taxCodeRes.data.error || 'Success');
    results.tax_center = taxCodeRes.status === 201 || taxCodeRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 5. HRMS (Employee) ---');
    const empPayload = {
        employee_id: 'EMP' + Date.now(),
        name: 'API Tester',
        email: 'tester' + Date.now() + '@example.com',
        status: 'active',
        joining_date: new Date().toISOString(),
        department: 'Testing'
    };
    const empRes = await api('/hrms/employees', 'POST', empPayload);
    console.log('Create Employee:', empRes.status, empRes.data.error || 'Success');
    results.hrms = empRes.status === 201 || empRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 6. CRM (Lead) ---');
    const leadRes = await api('/crm/leads', 'POST', {
        company_name: 'Test Corp',
        contact_name: 'Jane Smith',
        email: 'jane@testcorp.com',
        status: 'new'
    });
    console.log('Create Lead:', leadRes.status, leadRes.data.error || 'Success');
    results.crm = leadRes.status === 201 || leadRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 7. Sales (Quotation) ---');
    const quotePayload = {
        number: 'QT-API-' + Date.now(),
        customerName: 'API Customer',
        date: new Date().toISOString().split('T')[0],
        items: [
            { description: 'Consulting', quantity: 1, unitPrice: 1000, total: 1000 }
        ],
        subtotal: 1000,
        taxRate: 5,
        taxAmount: 50,
        total: 1050,
        status: 'draft'
    };
    const quoteRes = await api('/sales-documents/quotations', 'POST', quotePayload);
    console.log('Create Quotation:', quoteRes.status, quoteRes.data.error || 'Success');
    results.sales = quoteRes.status === 201 || quoteRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 8. Procurement (PO) ---');
    // Need a vendor
    const vendorRes = await api('/misc/vendors', 'POST', { name: 'Test Vendor ' + Date.now(), legal_name: 'Test Vendor LLC' });
    if (vendorRes.status !== 201 && vendorRes.status !== 200) {
        // Try direct procurement vendor create if misc fails
        await api('/procurement/vendors', 'POST', { name: 'Test Vendor ' + Date.now(), legal_name: 'Test Vendor LLC' });
    }
    const vendors = await api('/procurement/vendors');
    const vendorId = vendors.data?.[0]?._id || '60d5ecdec0d5ecdec0d5ecde'; // Fallback to a mongo ID if needed

    const poPayload = {
        po_number: 'PO-API-' + Date.now(),
        vendor_id: vendorId,
        total_amount: 105,
        status: 'draft',
        lines: [
            { 
                description: 'Raw Material', 
                quantity: 10, 
                unit_price: 10, 
                amount: 100,
                total_amount: 105 
            }
        ]
    };
    const poRes = await api('/procurement/orders', 'POST', poPayload);
    console.log('Create PO:', poRes.status, poRes.status !== 201 && poRes.status !== 200 ? JSON.stringify(poRes.data) : 'Success');
    results.procurement = poRes.status === 201 || poRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 9. Inventory (Item) ---');
    const itemRes = await api('/inventory/items', 'POST', {
        sku: 'SKU-API-' + Date.now(),
        name: 'API Item',
        category: 'raw-materials',
        unit: 'pcs',
        initial_stock: 0
    });
    console.log('Create Item:', itemRes.status, itemRes.status !== 201 && itemRes.status !== 200 ? JSON.stringify(itemRes.data) : 'Success');
    results.inventory = itemRes.status === 201 || itemRes.status === 200 ? 'PASS' : 'FAIL';

    console.log('\n--- 10. Manufacturing (BOM) ---');
    // Need items
    const itemRM = await api('/inventory/items', 'POST', { sku: 'RM-' + Date.now(), name: 'Raw Mat', category: 'raw-materials' });
    const itemFG = await api('/inventory/items', 'POST', { sku: 'FG-' + Date.now(), name: 'Fin Good', category: 'finished-goods' });
    
    if (itemRM.data?._id && itemFG.data?._id) {
        const bomPayload = {
            code: 'BOM-API-' + Date.now(),
            product_id: itemFG.data._id,
            product_name: 'Fin Good',
            components: [
                {
                    item_id: itemRM.data._id,
                    item_name: 'Raw Mat',
                    quantity: 2,
                    unit_cost: 10,
                    total_cost: 20
                }
            ],
            labor_cost: 5,
            total_cost: 20,
            total_manufacturing_cost: 25
        };
        const bomRes = await api('/manufacturing/boms', 'POST', bomPayload);
        console.log('Create BOM:', bomRes.status, bomRes.status !== 201 && bomRes.status !== 200 ? JSON.stringify(bomRes.data) : 'Success');
        results.manufacturing = bomRes.status === 201 || bomRes.status === 200 ? 'PASS' : 'FAIL';
    } else {
        console.log('Skipping BOM test - items not created');
        results.manufacturing = 'FAIL (Dependency)';
    }

    console.log('\n--- Phase 1 Summary ---');
    console.log(JSON.stringify(results, null, 2));

    return results;
}

runTests();
