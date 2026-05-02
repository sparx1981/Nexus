# Nexus-9 Product Specification

> **Last Updated:** 2026-05-02 | **Changed:** Workflow Designer v2 (Recursive Condition Builder), Google Chat & Advanced HTTP actions. Implemented project-wide settings for application headings, colors, and button styles. Integrated "Require Sign-In" enforcement at the project level. Fixed updateDoc undefined value errors in schema store. **Refined UI button readability on light backgrounds and fixed stacking context for global palette/settings overlays.**

## 1. Product Concept
Nexus-9 is a browser-based architectural and business modeling workspace that bridges the gap between structured data and custom business applications. It allows users to design schemas, orchestrate logic via workflows, and build polished UIs with deep data integration.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS v4.
- **State Management**: Zustand for editor state, auth, and global project settings.
- **Backend/Database**: Firebase Firestore for real-time data persistence.
- **App Builder**: Free-form canvas using absolute positioning and @dnd-kit/core. Supports draggable and resizable UI components (Input, Select, Table, Chart, etc.).
- **Global Theming**: Project-level design tokens (colors, headings) applied via `useProjectSettingsStore` and injected into CSS variables (`--project-*`).
- **Integrations**: Specialized OAuth-based connector for Trimble Connect and custom REST API interface.

## 3. Data Infrastructure
Nexus-6 uses a standardized workspace-centric Firestore structure:

### `/workspaces/{workspaceId}`
The root container for all workspace resources.

#### `/workspaces/{workspaceId}/settings/project`
Global configuration document for workspace-wide behavior and appearance.
- `enableApplicationHeadings`: boolean
- `headingText`: string
- `headingHeight`: number
- `headingBackgroundColour`: string
- `applicationBackgroundColour`: string
- `componentPrimaryColour`: string
- `componentSecondaryColour`: string
- `buttonColourStandard`: string
- `buttonColourHover`: string
- `buttonColourClicked`: string
- `requireSignIn`: boolean

#### `/workspaces/{workspaceId}/tables`
Collection defining the data models (entities).
- `fields`: Field[]
- `position`: { x: number, y: number }

## 4. Module Specifications

### Navigation & Identity
- **Project Switcher**: The currently active project name is displayed at the top of the sidebar. Clicking it resets the project context and returns the user to the Project Picker.

### App Builder
- **Project Inheritance**: Applications inherit global background colors, header styles, and button colors from Project Settings unless explicitly overridden.
- **Security Check**: If `requireSignIn` is enabled in Project Settings, applications perform a mandatory auth check before rendering content.
- **Canvas**: Free-form workspace with absolute positioning. Supports `@dnd-kit/core` for drag-and-drop orchestration.
- **Properties Panel**: Collapsible right sidebar for granular component configuration.
    - **Unified Datasources**: Dropdown including both persistent Tables and connected REST API schemas.
- **Components**:
    - `button`: Supports 'Primary', 'Secondary', 'Custom', and 'Delete' styles. Defaults use Project-level colors for standard, hover, and active states.

### Workflow Designer
- **Canvas**: React Flow automation engine.
- **Full Configuration UIs**:
    - **Record Created/Updated**: Mapping to target workspace tables.
    - **Condition (Logic)**: Recursive, multi-level condition builder supporting nested AND/OR groups. Includes "True" and "False" output handles.
    - **Google Chat**: Webhook-based messaging. Supports dynamic message body and thread keys.
    - **Advanced HTTP**: Full REST client orchestration. Supports GET/POST/PUT/PATCH/DELETE, custom headers, and dynamic JSON bodies.
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
