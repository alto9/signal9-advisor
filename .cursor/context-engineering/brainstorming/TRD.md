# Technical Requirements Document

## Hosting

- All aspects will be hosted in AWS and built with TypeScript

## Pipeline

- test > build > deploy > validate pipeline within Gitlab

## User authentication

- handled with auth0 integration

## Event-Driven Architecture

- Signal9 leverages an event-driven architecture to orchestrate data collection, change detection, and AI analysis.
- Key processes (such as scheduled batch pollenation and on-demand user-triggered pollenation) are unified through event dispatching and handling.
- Events (e.g., `analysisNeeded`) are emitted when new or stale data is detected, ensuring that AI processing is only performed when necessary.
- This approach enables scalable, decoupled workflows and supports both real-time and batch processing needs.