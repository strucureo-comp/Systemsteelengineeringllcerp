# Testing & Quality Assurance

Quality assurance in BridgeBreak ERP is a multi-layered process involving unit tests, integration tests, and autonomous browser-based verification.

## 1. Backend Testing
- **Framework:** Jest & Supertest.
- **Location:** `backend/tests/`.
- **Execution:** `npm test` inside the `backend/` directory.
- **Scope:** API endpoint validation, business logic verification (services), and database interaction.

## 2. Frontend Validation
- **Type Checking:** Run `npm run typecheck` to ensure TypeScript compliance.
- **Linting:** Run `npm run lint` for code style and potential bug detection.
- **Build Verification:** Run `npm run build` to ensure the application compiles correctly for production.

## 3. Mandatory Autonomous Browser Testing
For AI agents (like Gemini CLI), a feature is NOT considered complete until it has been visually and functionally verified in a real browser.

### The Workflow:
1. **Implementation:** Code the feature according to requirements.
2. **Setup:** Ensure both frontend and backend are running locally.
3. **Verification via `chrome-devtools-mcp`:**
   - **Navigation:** Navigate to the specific route where the feature lives.
   - **Interaction:** Click buttons, fill forms, and trigger actions as a user would.
   - **Validation:** 
     - Check for expected UI changes (success toasts, new list items, updated charts).
     - Inspect the Network panel to ensure API calls are successful (200/201 status).
     - Check the Console for any runtime errors.
4. **Correction:** If the browser test fails, diagnose the issue, apply a fix, and RE-TEST until successful.

## 4. CI/CD Integration
Automated tests are executed on every pull request and push to the `main` branch via GitHub Actions.
- **Pipeline:** See `docs/ci-cd.md` for details.
- **Artifacts:** Test coverage reports and build logs are available in the GitHub Actions dashboard.
