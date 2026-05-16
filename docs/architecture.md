# Architecture & Tech Stack

## Overview
BridgeBreak ERP is built as a decoupled full-stack application. It features a modern, responsive frontend powered by Next.js and a robust, modular backend built with Express.js and MongoDB.

## System Architecture

### 1. Frontend (Client Layer)
- **Framework:** Next.js 13+ (App Router)
- **Directory Structure:**
  - `app/`: Contains the routing logic and page layouts.
  - `components/`: UI components organized by module (e.g., `components/finance`).
  - `lib/`: Shared utilities, API clients (`api.ts`), and context providers.
- **Styling:** Tailwind CSS with Radix UI primitives for high accessibility and consistent design.

### 2. Backend (API Layer)
- **Framework:** Express.js
- **Architecture:** Modular MVC-like structure where each ERP module has its own routes and models.
- **Directory Structure:**
  - `backend/routes/`: Route definitions and controller logic.
  - `backend/models/`: Mongoose schemas.
  - `backend/services/`: Reusable business logic (e.g., `approvalEngine.js`).
  - `backend/middleware/`: Security, authentication, and validation layers.

### 3. Database (Data Layer)
- **Technology:** MongoDB
- **ODM:** Mongoose
- **Pattern:** Document-oriented, optimized for flexibility in ERP data structures (e.g., dynamic fields in HRMS or Finance).

## Integration & Communication
- **API Communication:** The frontend communicates with the backend exclusively via RESTful APIs.
- **Authentication:** Stateless JWT-based authentication. The token is typically stored in cookies or handled via secure headers.
- **File Storage:** Local file system during development (in `uploads/` folder), with abstraction via `storageService.js` for future cloud integration.

## Key Design Patterns
- **Modular Design:** Each business unit (CRM, HR, etc.) is isolated in both frontend and backend to ensure scalability.
- **Centralized Approval Engine:** A core service that any module can hook into to require multi-level approvals for sensitive actions (e.g., approving a purchase order).
- **Tenant Guarding:** Middleware in the backend ensures data isolation between different company tenants.
