# Development Workflow & Testing

## Development Principles
1. **Simplicity:** Write clean, understandable code. Avoid unnecessary abstractions.
2. **Speed:** Deliver features quickly by leveraging existing components and backend services.
3. **Consistency:** Stick to established patterns in both frontend and backend.

## Feature Completion & Autonomous Testing
When developing features using AI agents (like Gemini CLI), the following workflow is mandatory:

1. **Implementation:** Develop the requested feature end-to-end.
2. **Autonomous Testing via Chrome DevTools MCP:** 
   - After *each* feature completion, the agent MUST use `chrome-devtools-mcp` to autonomously test the feature in the browser.
   - Navigate to the page, interact with elements, fill out forms, and verify the expected UI changes and network requests.
3. **Iterative Looping:**
   - The agent MUST loop and refine the implementation until the application has the expected features completed properly and passing the visual/functional checks.
   - Do not stop until the feature is fully verified.
