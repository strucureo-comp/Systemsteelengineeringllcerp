# Backend Guide

The backend is built with Express.js and Mongoose.

## Directory Structure
- `backend/models/`: Mongoose schemas and models.
- `backend/routes/`: Express routes mapping endpoints to controllers/handlers.
- `backend/middleware/`: Custom middleware (auth, permissions, tenantGuard, validate).
- `backend/services/`: Core business logic and service layer (e.g., approvalEngine, emailService).
- `backend/validators/`: Input validation logic using `express-validator`.
- `backend/plugins/`: Mongoose plugins (e.g., `softDelete.js`).

## Authentication & Authorization
- JWT tokens are issued on login.
- Middleware handles validating the token and checking user permissions/roles.
