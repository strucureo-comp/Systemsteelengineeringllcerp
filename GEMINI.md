# Project Guidelines

## Core Development Mandate
- **Simplicity:** Favor simple, readable solutions over complex architectures.
- **Speed:** Aim for efficient implementations.
- **Consistency:** Follow the existing patterns for Next.js App Router and the Express backend.

## AI Agent Workflow & Autonomous Testing
- **Test After Every Feature:** After completing any feature implementation, you MUST use the `chrome-devtools-mcp` to autonomously test the feature in a real browser environment.
- **Iterative Refinement:** Loop through the "Plan -> Act -> Validate" cycle continuously. Do not stop until the application has the features exactly as expected and completed properly. If tests fail, diagnose and fix them, then test again.
- **Validation is Finality:** A feature is not complete until it has been visually and functionally verified using browser automation tools.
