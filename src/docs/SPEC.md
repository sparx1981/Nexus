# Nexus-6 Product Specification

> **Last Updated:** 2026-05-01 | **Changed:** Nexus-6 Release. Implemented Free-form layout in App Builder with draggable/resizable components. Unified datasource selection for Tables and REST APIs. Expanded Workflow Designer with full configuration UIs for Triggers, Actions, and Logic nodes. Improved Trimble Connect integration with real-time project sync simulation. Updated Metadata for Nexus-6 branding.

## 1. Product Concept
Nexus-6 is a browser-based architectural and business modeling workspace that bridges the gap between structured data and custom business applications. It allows users to design schemas, orchestrate logic via workflows, and build polished UIs with deep data integration.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS v4.
- **State Management**: Zustand for editor state and auth.
- **Backend/Database**: Firebase Firestore for real-time data persistence.
- **App Builder**: Free-form canvas using absolute positioning and @dnd-kit/core. Supports draggable and resizable UI components (Input, Select, Table, Chart, etc.).
- **Theming**: Professional Grey/Primary palette. Integrated Light and Dark mode using professional grey scales (#F8FAFC, #F1F5F9).
- **Integrations**: Specialized OAuth-based connector for Trimble Connect and custom REST API interface.

## 3. Data Infrastructure
Nexus-6 uses a standardized workspace-centric Firestore structure:

### `/workspaces/{workspaceId}`
The root container for all workspace resources.

#### `/workspaces/{workspaceId}/tables`
Collection defining the data models (entities).
- `fields`: Field[]
- `position`: { x: number, y: number }

## 4. Module Specifications

### App Builder
- **Canvas**: Free-form workspace with absolute positioning. Supports `@dnd-kit/core` for drag-and-drop orchestration.
- **Properties Panel**: Collapsible right sidebar for granular component configuration.
    - **Unified Datasources**: Dropdown including both persistent Tables and connected REST API schemas.
    - **Data Binding**: Mapping of individual component properties (values, options) to datasource fields.
- **Components**:
    - `input`: Text input with label mapping.
    - `select`: Dynamic options from manual input or datasource fields.
    - `table`: Multi-column display with unified datasource support.
    - `chart`: Recharts-based visualization.

### Workflow Designer
- **Canvas**: React Flow automation engine.
- **Full Configuration UIs**:
    - **Record Created/Updated**: Mapping to target workspace tables.
    - **Webhook**: Secure ID and Secret key generation.
    - **Scheduled**: Frequency and time-of-day cadence settings.
    - **AI Generate**: Prompt builder with dynamic variable output (`{{ai_summary}}`).
    - **Email Action**: Support for CC, Subject, Body, and dynamic file attachments.

### Integrations Portal
- **Trimble Connect**: OAuth-based connector.
    - **Sync Logic**: Real-time project directory pulling. Synchronization adds "Virtual Tables" to the Schema Store, allowing Trimble data to be used directly in the App Builder and Query Builder.

## 5. File Structure (Key Files)
- `src/components/AppBuilder/AppBuilder.tsx`: Core logic for free-form app creation and property management.
- `src/components/Workflows/WorkflowDesigner.tsx`: React Flow implementation with full step-wise configuration UIs.
- `src/components/Integrations/TrimbleConnectView.tsx`: Real-time architectural project synchronization bridge.
- `src/store/builderStore.ts`: Management of canvas components, positions, and global app configuration.
