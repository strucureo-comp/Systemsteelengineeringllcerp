# Architecture & Tech Stack

## Overview
This application is a modular ERP system with a monolithic Express.js backend and a Next.js frontend.

## Frontend
- **Framework:** Next.js 13+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Radix UI components (shadcn/ui style)
- **State Management:** React Hook Form, Zustand (or similar, if added)
- **Charts:** Recharts

## Backend
- **Framework:** Express.js (Node.js)
- **Database:** MongoDB via Mongoose
- **Authentication:** JWT (bcryptjs, jsonwebtoken)
- **Security:** helmet, express-rate-limit, express-mongo-sanitize, xss-clean
- **File Uploads:** multer, sharp
- **Documentation:** swagger-ui-express, swagger-jsdoc

## Integration
The frontend communicates with the backend via REST API using standard `fetch` or `axios`.
