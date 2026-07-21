# Mermaid Diagram Viewer Demo

Open this file in **Preview** mode. Hover over the diagram to reveal the expand control, then open it to test zoom, pan, Fit, and Escape-to-close.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Application Frontend
    participant Gateway as AutoByteus Gateway
    participant Host as Application Engine Host
    participant Worker as Application Worker
    participant Runtime as Runtime Orchestration
    participant Agent as Agent Runtime

    User->>Frontend: Start a new application run
    Frontend->>Gateway: GraphQL prepareChat
    Gateway->>Host: Execute GraphQL request
    Host->>Worker: executeGraphql(...)
    Worker->>Host: runtimeControl.startRun(...)
    Host->>Runtime: Create binding and start run
    Runtime->>Agent: Start agent
    Agent-->>Runtime: Run created
    Runtime-->>Host: Binding and run information
    Host-->>Worker: startRun result
    Worker-->>Host: GraphQL { bindingId, status }
    Host-->>Gateway: GraphQL result
    Gateway-->>Frontend: HTTP response
    Frontend-->>User: Application run is ready
```

## Expected experience

- In Preview mode, the diagram is rendered rather than shown as source code.
- On desktop, hover over the diagram to reveal the compact expand icon.
- The expanded viewer provides zoom out, Fit, zoom in, and close controls.
- Press `Escape` to close the viewer.
