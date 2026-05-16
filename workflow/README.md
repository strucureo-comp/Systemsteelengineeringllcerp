# CI/CD Workflow Documentation

## Structure
- `.github/workflows/ci.yml`: The main GitHub Actions pipeline definition.
- `Dockerfile.backend`: Docker configuration for the API server.
- `Dockerfile.frontend`: Docker configuration for the Next.js frontend.
- `backend/tests/`: Location for backend integration and unit tests.

## Pipeline Steps
1. **Backend Testing**: Spins up a MongoDB service, installs dependencies, and runs Jest tests.
2. **Frontend Testing**: Installs dependencies, runs TypeScript type-checking, ESLint, and a production build.
3. **Security Scan**: Runs `npm audit` on both folders to check for vulnerable dependencies.
4. **Docker Build**: Builds and pushes Docker images to Docker Hub (only on `main` branch pushes).
5. **Deployment**: Placeholder step for final server synchronization.

## Local Testing
To run tests locally:
- Backend: `cd backend && npm test`
- Frontend Build: `npm run build`
