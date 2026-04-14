# Module 1: Authentication & Authorization

## Overview
Handles user login, registration, session management, and role-based access control.

## Frontend Components
- **Location**: `lib/auth/context.tsx`
- **Provider**: `AuthProvider` (wraps entire app in `app/layout.tsx`)
- **Hook**: `useAuth()` - access user, token, sign in/out functions

## Backend Routes
- **Location**: `backend/routes/auth.js`
- **Endpoints**:
  - `POST /api/auth/signup` - Register new user
  - `POST /api/auth/login` - Login with email/password
  - `GET /api/auth/me` - Get current user info
  - `GET /api/auth/users` - List all users

## Data Model
```javascript
User {
  _id: ObjectId
  email: String (unique, lowercase)
  password: String (bcrypt hashed)
  full_name: String
  role: 'admin' | 'user' | 'superadmin'
  avatar_url: String (optional)
  is_active: Boolean
  createdAt, updatedAt: Date
}
```

## Authentication Flow
1. User enters credentials on `/login` page
2. Frontend calls `signIn(email, password)` from `AuthProvider`
3. Sends `POST /api/auth/login` to backend
4. Backend validates credentials, generates JWT token
5. Token stored in localStorage as `bb_token`
6. AuthProvider sets user state
7. All subsequent requests include `Authorization: Bearer {token}` header
8. Backend middleware validates JWT on protected routes

## JWT Token Details
- **Payload**: `{userId, role}`
- **Secret**: `process.env.JWT_SECRET`
- **Expiry**: 7 days
- **Storage**: localStorage (`bb_token`)
- **Validation**: `backend/middleware/auth.js`

## API Functions (lib/api.ts)
```typescript
signIn(email, password) → {error: Error | null}
signUp(email, password, fullName) → {error: Error | null}
signOut() → void
refreshUser() → Promise<void>
getUsers() → User[]
getUser(id) → User | null
```

## Connections to Other Modules
- **TenantProvider**: Loads after auth to get company profile
- **Module Gate**: Uses user role to check module access
- **All Protected Routes**: Require valid JWT token

## Security Features
✅ Password hashing with bcryptjs (12 rounds)
✅ JWT token-based authentication
✅ Token expiry (7 days)
✅ Protected API routes via middleware
✅ Role-based access control

## Setup Stage
- Part of "company_setup_complete" in tenant status
- Required before accessing any module
