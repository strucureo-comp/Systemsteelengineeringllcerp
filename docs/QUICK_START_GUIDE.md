# BridgeBreak ERP - Quick Start & Development Guide

## Project Summary

**BridgeBreak** is a comprehensive, multi-module ERP system designed for enterprises. It supports 13+ business modules including Finance, Sales, HR, Inventory, Manufacturing, Procurement, Projects, and more.

**Tech Stack**
- Frontend: Next.js 13.5.1 + React 18 + TypeScript + Tailwind CSS
- Backend: Express.js + Node.js
- Database: MongoDB + Mongoose
- Auth: JWT + bcryptjs
- UI: Radix UI + 45+ custom components

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- MongoDB (local or Atlas)
- Git

### Installation

**Frontend Setup**
```bash
# Clone and install
git clone <repo>
cd <project>
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api" > .env.local

# Run development server
npm run dev
# Opens http://localhost:3000
```

**Backend Setup**
```bash
# Navigate to backend
cd backend
npm install

# Create .env
cat > .env << EOF
PORT=4000
MONGODB_URI=mongodb://localhost:27017/bridgebreak
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000
EOF

# Run development server
npm run dev
# Runs on http://localhost:4000
```

### First Run
1. Frontend loads on http://localhost:3000
2. Redirects to /login (no user yet)
3. Backend API available at http://localhost:4000/api
4. Create test user via POST /api/auth/signup
5. Login and explore dashboard

---

## Project Structure

### Frontend (`/app`)
```
app/
├── (admin)/admin/          # Main admin area
│   ├── dashboard/          # Dashboard
│   ├── finance/            # Finance module
│   ├── sales/              # Sales/CRM module
│   ├── hr/                 # HR module
│   ├── inventory/          # Inventory module
│   ├── manufacturing/      # Manufacturing module
│   ├── purchases/          # Procurement module
│   ├── projects/           # Projects module
│   ├── operations/         # Operations module
│   ├── reports/            # Reports module
│   ├── masters/            # Master data module
│   └── settings/           # Settings module
├── login/                  # Login page
├── profile/                # User profile
└── layout.tsx              # Root layout
```

### Backend (`/backend`)
```
backend/
├── routes/                 # API endpoints (20 files)
├── models/                 # Mongoose schemas (20 files)
├── middleware/             # Auth middleware
├── config/                 # Database config
├── server.js               # Express app
└── seed.js                 # Database seeding
```

### Components (`/components`)
```
components/
├── ui/                     # 45+ UI components
├── finance/                # Finance-specific components
└── shared/                 # Layout & common components
```

### Libraries (`/lib`)
```
lib/
├── auth/                   # Authentication context
├── api.ts                  # 100+ API functions
├── tenant-context.tsx      # Tenant management
├── module-gate.ts          # Module access control
└── services/               # Business logic services
```

---

## Common Development Tasks

### Adding a New Page

1. Create folder: `app/(admin)/admin/[module]/[page]/`
2. Create `page.tsx`:
```tsx
import { DashboardShell } from '@/components/shared/layout/dashboard-shell';

export default function Page() {
  return (
    <DashboardShell>
      <div>Your content here</div>
    </DashboardShell>
  );
}
```

### Adding a New API Endpoint

1. Create/edit route file: `backend/routes/[module].js`
2. Add handler:
```javascript
router.get('/items', auth, async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

3. Export function in `lib/api.ts`:
```typescript
export async function getItems(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/[module]/items`);
    if (res.ok) return res.json();
  } catch (e) { console.warn('[API] error:', e); }
  return [];
}
```

### Adding a New Data Model

1. Create schema: `backend/models/[Module].js`
```javascript
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, default: 'active' },
  timestamps: true
});

module.exports = mongoose.model('Model', schema);
```

2. Create route: `backend/routes/[module].js`
3. Export API functions in `lib/api.ts`

### Adding a New Component

1. Create: `components/[category]/[Component].tsx`
2. Use in pages:
```tsx
import { MyComponent } from '@/components/category/MyComponent';

export default function Page() {
  return <MyComponent />;
}
```

---

## Key Concepts

### Authentication
- JWT tokens stored in localStorage (`bb_token`)
- 7-day expiry
- Validated on every protected request
- User role: admin, user, superadmin

### Module Access Control
- Tenant determines active modules
- Business type affects available modules
- Module gate checks access before rendering
- Sidebar shows only accessible modules

### Data Flow
1. User interacts with component
2. Component calls API function from `lib/api.ts`
3. API function sends HTTP request with JWT
4. Backend validates JWT via auth middleware
5. Route handler processes request
6. Mongoose queries MongoDB
7. Response returned to frontend
8. Component state updated
9. UI re-renders

### Tenant Context
- Loads company profile on app start
- Determines active modules
- Provides sector-specific labels
- Manages setup progress

---

## API Reference

### Authentication
```
POST /api/auth/signup
  Body: {email, password, full_name}
  Returns: {user, token}

POST /api/auth/login
  Body: {email, password}
  Returns: {user, token}

GET /api/auth/me
  Headers: Authorization: Bearer {token}
  Returns: {user}
```

### Finance
```
GET /api/finance/invoices
POST /api/finance/invoices
PUT /api/finance/invoices/:id
DELETE /api/finance/invoices/:id

GET /api/finance/expenses
POST /api/finance/expenses
PUT /api/finance/expenses/:id
DELETE /api/finance/expenses/:id

GET /api/finance/accounts
POST /api/finance/accounts

GET /api/finance/journals
POST /api/finance/journals

GET /api/finance/summary
```

### Inventory
```
GET /api/inventory/items
POST /api/inventory/items

GET /api/inventory/warehouses

POST /api/inventory/move
  Body: {type, item_id, source_warehouse_id, dest_warehouse_id, quantity, unit_cost}

GET /api/inventory/summary
```

### HRMS
```
GET /api/hrms/employees
POST /api/hrms/employees
PUT /api/hrms/employees/:id

GET /api/hrms/attendance
POST /api/hrms/attendance

GET /api/hrms/leaves
POST /api/hrms/leaves

GET /api/hrms/payrolls
POST /api/hrms/payrolls
```

### CRM
```
GET /api/crm/leads
POST /api/crm/leads
PUT /api/crm/leads/:id
DELETE /api/crm/leads/:id

GET /api/crm/opportunities
POST /api/crm/opportunities

GET /api/crm/customers
POST /api/crm/customers
```

---

## Database Models

### User
```javascript
{
  email: String (unique),
  password: String (hashed),
  full_name: String,
  role: 'admin' | 'user' | 'superadmin',
  avatar_url: String,
  is_active: Boolean,
  timestamps
}
```

### Invoice
```javascript
{
  invoice_number: String (unique),
  type: 'invoice' | 'credit_note' | 'debit_note',
  customer_name: String,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial',
  items: [{description, quantity, unit_price, tax_rate, amount}],
  subtotal, tax_amount, total, amount_paid,
  currency: String,
  timestamps
}
```

### Employee
```javascript
{
  employee_id: String (unique),
  name, email, phone,
  department_id: ObjectId,
  hr_role_id: ObjectId,
  employment_type: 'full-time' | 'contract' | 'part-time',
  joining_date: Date,
  status: 'active' | 'inactive' | 'on-leave' | 'terminated',
  basic_salary, overtime_rate,
  bank_details: {account_name, account_number, bank_name, iban},
  timestamps
}
```

### Item (SKU)
```javascript
{
  sku: String (unique),
  name, description, category,
  status: 'active' | 'discontinued' | 'planning',
  uom_base: String,
  valuation_method: 'FIFO' | 'WAC' | 'Standard',
  standard_cost, last_purchase_price,
  reorder_level, safety_stock, lead_time_days,
  is_serial_tracked, is_batch_tracked: Boolean,
  timestamps
}
```

---

## Debugging Tips

### Frontend Issues
- Check browser console for errors
- Verify API_BASE_URL in .env.local
- Check localStorage for bb_token
- Use React DevTools to inspect state
- Check network tab for API calls

### Backend Issues
- Check server.log for errors
- Verify MongoDB connection
- Check JWT_SECRET is set
- Verify CORS_ORIGIN matches frontend URL
- Use Postman to test endpoints

### Database Issues
- Verify MongoDB is running
- Check MONGODB_URI connection string
- Use MongoDB Compass to inspect data
- Check indexes are created
- Verify unique constraints

---

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement pagination for large lists
- Cache API responses in localStorage
- Lazy load routes with dynamic imports
- Optimize images with next/image

### Backend
- Add database indexes on frequently queried fields
- Implement pagination for list endpoints
- Use lean() for read-only queries
- Cache frequently accessed data
- Implement rate limiting

### Database
- Create indexes on foreign keys
- Create compound indexes for common queries
- Archive old data periodically
- Monitor query performance
- Use connection pooling

---

## Deployment

### Frontend (Netlify)
```bash
npm run build
# Deploy dist folder to Netlify
```

### Backend (Node.js)
```bash
cd backend
npm install --production
npm start
```

### Environment Variables
Set in hosting platform:
- NEXT_PUBLIC_API_BASE_URL
- MONGODB_URI
- JWT_SECRET
- CORS_ORIGIN

---

## Troubleshooting

**"Cannot find module" errors**
- Run `npm install` in both root and backend
- Clear node_modules and reinstall

**"JWT invalid" errors**
- Check JWT_SECRET matches between frontend and backend
- Verify token is being sent in Authorization header
- Check token hasn't expired

**"CORS error"**
- Verify CORS_ORIGIN in backend .env matches frontend URL
- Check backend is running on correct port

**"MongoDB connection failed"**
- Verify MongoDB is running
- Check MONGODB_URI is correct
- Verify network access (if using Atlas)

**"API returns 404"**
- Verify route exists in backend
- Check route path matches API call
- Verify middleware isn't blocking request

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

**Last Updated**: 2024
**Status**: Ready for development
