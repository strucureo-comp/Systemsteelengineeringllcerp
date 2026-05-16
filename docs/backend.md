# Backend Development Guide

The BridgeBreak ERP backend is a modular Node.js/Express.js application designed for scalability and security.

## Core Structure
- **Entry Point:** `backend/server.js` - Configures middleware, connects to MongoDB, and registers all module routes.
- **Models:** `backend/models/` - Mongoose schemas. Models like `User`, `HRMS`, and `Finance` use shared plugins like `softDelete.js`.
- **Routes:** `backend/routes/` - Express routers. Many routes combine controller logic directly for simplicity, while complex ones delegate to services.
- **Services:** `backend/services/` - Contains complex business logic that spans multiple models or requires external integrations (e.g., `emailService.js`, `reportService.js`).

## Security Layers
The backend implements multiple layers of security middleware in `server.js`:
1. **Helmet:** Sets various HTTP headers to secure the app.
2. **CORS:** Restricts API access to allowed origins.
3. **Rate Limiting:**
   - `authLimiter`: Strict limits on login/signup (10 attempts/15min).
   - `apiLimiter`: General API limits (300 requests/min/tenant).
   - `reportLimiter`: Throttles heavy report generation queries.
4. **NoSQL Injection Prevention:** Uses `express-mongo-sanitize` to strip dangerous characters from inputs.
5. **XSS Protection:** Uses `xss-clean` to sanitize user-provided HTML/strings.
6. **Authentication:** `auth.js` middleware validates JWTs and attaches the `user` object to the request.
7. **Tenant Isolation:** `tenantGuard.js` ensures that users can only access data belonging to their specific `tenant_id`.

## API Documentation
The API is documented using Swagger (OpenAPI 3.0).
- **UI:** Accessible at `/api-docs` when the server is running.
- **JSON:** Available at `/api-docs.json`.
- **Configuration:** Defined in `backend/config/swagger.js`.

## Key Services
- **Approval Engine (`services/approvalEngine.js`):** Manages the lifecycle of approval requests.
- **Currency Service (`services/currencyService.js`):** Handles exchange rate conversions and multi-currency logic.
- **Report Service (`services/reportService.js`):** Orchestrates the generation of complex financial and operational reports.
