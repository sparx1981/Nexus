# Nexus Product Specification

> **Last Updated:** 2026-05-01 | **Changed:** Implemented Workflow Designer DnD, enhanced Send Email action (CC/Attachments), real Firestore queries in Data Studio, CSV export in Query results, and expanded Integration portals (REST API / Trimble). Standardized field types and added CellInput for stable state management.

## 1. Product Concept
Nexus is a browser-based architectural and business modeling workspace that bridges the gap between structured data and custom business applications. It allows users to design schemas, orchestrate logic via workflows, and build polished UIs with deep data integration.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS.
- **State Management**: Zustand for editor state and auth.
- **Backend/Database**: Firebase Firestore for real-time data persistence.
- **Workspace Architecture**: Multi-tenant workspace model. All project resources are centralized under `workspaces/{workspaceId}`. The active `workspaceId` is dynamically managed via the `selectedProjectId` in `authStore`.
- **Theming**: Integrated Light and Dark mode with professional grey scales (#F8FAFC, #F1F5F9). Supports local persistence and document level class toggling.
- **Data Layer**: Centralized `collections.ts` defines dynamic Firestore path factories. `dataService.ts` handles granular record operations with mandatory `workspaceId` injection.
- **Error Handling**: Standardized `handleFirestoreError` in `dataService.ts` for consistent debugging and permission analysis.
- **Authentication**: Firebase Authentication with support for Trimble Connect OAuth (token-based).
- **AI**: Gemini 1.5 Flash via `@google/generative-ai`.

## 3. Data Infrastructure
Nexus uses a standardized workspace-centric Firestore structure:

### `/workspaces/{workspaceId}`
The root container for all workspace resources.
- `id`: string (doc ID)
- `name`: string
- `ownerId`: string
- `memberships`: Array<{ email: string, role: 'admin' | 'member', status: 'active' | 'pending', invitedAt: string }>

#### `/workspaces/{workspaceId}/tables`
Collection defining the data models (entities).
- `id`: string (doc ID)
- `name`: string
- `fields`: Field[]
- `position`: { x: number, y: number } // Persisted node coordinates for Schema View

#### `/workspaces/{workspaceId}/tableData/{tableId}/rows`
The actual data entries for each table. Fields are dynamic based on the table's schema. Supports real-time `onSnapshot` synchronization.

#### `/workspaces/{workspaceId}/dashboards`
Configurations for analytical views.

## 4. Module Specifications

### Data Studio
- **Schema View**: React Flow canvas with node-based table management. Supports context menus for table operations. Node positions are persisted in real-time. Includes an informational banner for onboarding.
- **Calculated Fields Engine**: 
    - **Editor**: Supports basic formula builder and advanced JavaScript code input.
    - **Runtime**: Context-aware evaluation engine with access to `row`, `allRecords`, `sum()`, `avg()`, and `Math` functions. Use of `new Function` for performant runtime calculation.
- **Table View**: Real-time record editing with Firestore `onSnapshot` integration. Includes CSV export and import capabilities. Uses `CellInput` for stable controlled state.
- **CSV Import Engine**: 
    - **Stages**: Choose Source -> Mapping -> Import.
    - **Features**: Auto-schema detection for new tables, field mapping for existing tables, batch commit logic.
- **Query Builder**:
    - **Features**: UI-driven filter builder (Field, Operator, Value).
    - **Integration**: Direct Firestore `query()` execution with `where`, `orderBy`, and `limit`.
    - **Export**: Results can be exported as CSV via PapaParse.

### Workflow Designer
- **Canvas**: React Flow-based automation engine with drag-and-drop support from a node palette.
- **Stages**: 
    - **Triggers**: Record Created, Record Updated, Scheduled, Webhook.
    - **Actions**: Send Email (supports CC and Studio attachments), Update Record, Create Record, AI Generate.
    - **Logic**: Condition (IF/ELSE), Loop, Delay.
- **DnD Integration**: Node palette items use standard HTML5 DnD to transfer metadata. `reactFlowInstance.screenToFlowPosition` is used for precise placement upon drop.

### Integrations Portal
- **REST API**: Custom JSON endpoint configuration with header management and live testing.
- **Trimble Connect**: Specialized OAuth-based connector for syncing architectural project data, including region selection and webhook-driven real-time sync.

## 5. File Structure (Key Files)
- `src/App.tsx`: Main Studio shell with sidebar navigation and sync initializers. Handles Light/Dark mode persistence.
- `src/components/DataStudio/DataStudio.tsx`: Core logic for Table and Query views. Standardizes `CellInput` and `evaluateExpression`.
- `src/components/Workflows/WorkflowDesigner.tsx`: React Flow implementation with DnD and property management.
- `src/components/Integrations/`: Specialized connector views (Trimble, REST API).
- `src/components/DataStudio/CSVImportModal.tsx`: Specialized import engine.
- `src/components/HelpResources.tsx`: Unified support center with User Docs, Developer Suite, and Release Notes.
- `src/store/schemaStore.ts`: Management of tables, fields, and node positions.
- `src/services/dataService.ts`: Standardized Firestore CRUD with diagnostic error handling.

## 6. Data Models
```typescript
export interface Table {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  position?: { x: number; y: number };
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  calculatedExpression?: string; // For CALCULATED type
}

export enum FieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  DATE_TIME = 'datetime',
  BOOLEAN = 'boolean',
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  RELATION = 'relation',
  FORMULA = 'formula',
  FILE = 'file',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  JSON = 'json',
  AUTO_NUMBER = 'auto_number',
  CALCULATED = 'calculated',
}
```
