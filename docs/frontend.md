# Frontend Development Guide

The BridgeBreak ERP frontend is built with Next.js 13+ utilizing the App Router architecture for optimal performance and developer experience.

## Directory Structure & Routing

### 1. App Router (`app/`)
- **Public Routes:** `login/`, `forgot-password/`, `reset-password/`, `accept-invite/`.
- **Protected Routes:** Located under the `(admin)/admin/` route group.
  - `(admin)/admin/dashboard/`: Main overview.
  - `(admin)/admin/finance/`: Financial management modules.
  - `(admin)/admin/hr/`: Human Resources and Payroll.
  - `(admin)/admin/settings/`: System and Tenant configuration.
- **Layouts:** Nested layouts are used to provide persistent sidebars and headers for the admin section.

### 2. Components (`components/`)
- **`ui/`:** Low-level, reusable primitives based on Radix UI (Buttons, Inputs, Dialogs, etc.).
- **`shared/`:** Common components used across multiple modules (e.g., `DataTable`, `ModuleHeader`).
- **Module-specific:** Folders like `components/finance` or `components/hr` contain specialized business components.

### 3. Library & Utilities (`lib/`)
- **API Clients:** `lib/api.ts` and module-specific clients (e.g., `api-manufacturing.ts`) handle communication with the Express backend.
- **Context Providers:** `tenant-context.tsx`, `theme-context.tsx`, and `settings-context.tsx` manage global state.
- **Utilities:** `lib/utils.ts` contains shared helper functions.

## Development Patterns

### Data Fetching
- **Client Components:** Use `useEffect` or specialized hooks for interactive data fetching.
- **Server Components:** Utilized where possible for initial page loads to improve SEO and performance.

### Forms & Validation
- **React Hook Form:** Primary library for managing form state.
- **Zod:** Used for schema-based validation on both frontend (client-side feedback) and backend (API safety).

### Styling
- **Tailwind CSS:** Used for all styling. Follow the "utility-first" approach.
- **Theming:** Supports light and dark modes via `next-themes`.

## API Integration
The frontend connects to the backend via the `API_URL` defined in environment variables. All requests to protected endpoints must include the JWT token, which is managed via the `session.ts` utility.
