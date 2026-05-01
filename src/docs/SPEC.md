# Nexus Product Specification

> **Last Updated:** 2026-05-01 | **Changed:** Fixed critical Firestore `permission-denied` errors by refactoring security rules logic and user query permissions. Decoupled workspace architecture to support multi-tenant projects via `selectedProjectId`. Standardized record path pattern to `workspaces/{workspaceId}/tableData/{tableId}/rows`.

## 1. Product Concept
Nexus is a browser-based architectural and business modeling workspace that bridges the gap between structured data and custom business applications. It allows users to design schemas, orchestrate logic via workflows, and build polished UIs with deep data integration.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS.
- **State Management**: Zustand for editor state and auth.
- **Backend/Database**: Firebase Firestore for real-time data persistence.
- **Workspace Architecture**: Multi-tenant workspace model. All project resources are centralized under `workspaces/{workspaceId}`. The active `workspaceId` is dynamically managed via the `selectedProjectId` in `authStore`.
- **Theming**: Integrated Light and Dark mode with professional grey scales (#F8FAFC, #F1F5F9).
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
- `position`: { x: number, y: number }

#### `/workspaces/{workspaceId}/tableData/{tableId}/rows`
The actual data entries for each table. Fields are dynamic based on the table's schema.

#### `/workspaces/{workspaceId}/dashboards`
Configurations for analytical views.
- `id`: string
- `name`: string
- `cards`: DashboardCard[]

#### `/workspaces/{workspaceId}/reports`
Configurations for document-based data exports and audits.
- `id`: string
- `elements`: ReportElement[]

## 4. Module Specifications

### Applications (App Builder)
- **Multi-App Management**: Complete listing view with Create, Edit, and Delete functionality.
- **Persistence**: Real-time cloud sync using workspace paths.

### Data Studio
- **Schema View**: React Flow canvas with node-based table management. Supports context menus for table operations.
- **Calculated Fields Engine**: 
    - **Editor**: Supports basic formula builder and advanced JavaScript code input.
    - **Runtime**: Context-aware evaluation engine with access to `row`, `allRecords`, `sum()`, `avg()`, and `Math` functions. Use of `new Function` for performant runtime calculation.
- **Table View**: Real-time record editing with Firestore `onSnapshot` integration.

### Workflows (Visual Designer)
- **Palette**: Triggers and Actions for business logic orchestration.

### Interactive Dashboards (Insight)
- **Dashboard Designer**: High-fidelity drag-and-drop workspace for widget configuration.
- **Data Connectivity**: Real-time binding to workspace tables. Select specific fields for Dimensions (X) and Measures (Y).

### Reports & Audits
- **Report Designer**: Document-centric editor for creating A4 data snapshots.
- **Elements**: Supports Text, Table, Chart, and Image components.

## 5. File Structure
- `src/App.tsx`: Main Studio shell with sidebar navigation and sync initializers.
- `src/lib/collections.ts`: Central source of truth for Firestore paths.
- `src/store/dashboardStore.ts`: Persistent state for widget-based dashboards.
- `src/store/reportStore.ts`: Persistent state for document-based reports.
- `src/store/schemaStore.ts`: Management of tables, fields, and relationships.
- `src/hooks/useSyncData.ts`: Global listener for workspace tables.

## 6. Data Models
```typescript
export interface Table {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  calculatedExpression?: string; // For CALCULATED type
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  CALCULATED = 'calculated',
  RELATION = 'relation'
}

export interface DashboardCard {
  id: string;
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'table';
  dataSourceId: string;
  config: any;
}
```

## 7. Build and Deployment
- Standard React/Vite SPA.
- Firebase integration requires `firebase-applet-config.json`.
- Production build targets `dist/` directory.
