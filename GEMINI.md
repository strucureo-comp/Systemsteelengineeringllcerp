# Project Guidelines

## 🗺️ Documentation Map
Use this map to find the right documentation for your task:
- **Project Index:** [docs/index.md](docs/index.md) - Start here for a general overview.
- **Architecture:** [docs/architecture.md](docs/architecture.md) - High-level system design and tech stack.
- **ERP Modules:** [docs/modules.md](docs/modules.md) - **USE THIS** to understand the business logic, models, and routes for specific ERP features (Finance, HR, CRM, etc.).
- **Backend Guide:** [docs/backend.md](docs/backend.md) - Deep dive into API structure, security, and services.
- **Frontend Guide:** [docs/frontend.md](docs/frontend.md) - Next.js structure, components, and styling patterns.
- **CI/CD:** [docs/ci-cd.md](docs/ci-cd.md) - Build pipelines and deployment info.
- **Testing:** [docs/testing.md](docs/testing.md) - **MANDATORY** reading for quality assurance and autonomous testing workflows.

## Core Development Mandate
- **Simplicity:** Favor simple, readable solutions over complex architectures.
- **Speed:** Aim for efficient implementations.
- **Consistency:** Follow the existing patterns for Next.js App Router and the Express backend.

## AI Agent Workflow & Autonomous Testing
- **Test After Every Feature:** After completing any feature implementation, you MUST use the `chrome-devtools-mcp` to autonomously test the feature in a real browser environment.
- **Iterative Refinement:** Loop through the "Plan -> Act -> Validate" cycle continuously. Do not stop until the application has the features exactly as expected and completed properly. If tests fail, diagnose and fix them, then test again.
- **Validation is Finality:** A feature is not complete until it has been visually and functionally verified using browser automation tools.
