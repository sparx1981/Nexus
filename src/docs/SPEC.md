# Nexus Product Specification

> **Last Updated:** 2026-04-30 | **Changed:** Implemented Report Viewer with structured tabular data and finalized platform architecture for MVP.

## 1. Executive Summary
Nexus is a cloud-native low-code platform. It enables the creation of data-driven business applications with a focus on AI-first development and modern data connectivity.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS.
- **State Management**: Zustand for editor state and TanStack Query for data synchronization.
- **Design System**: Nexus Design Language (NDL) based on Inter (sans) and JetBrains Mono (code).
- **Core Libraries**:
  - `React Flow`: Powers the Data Studio (Schema) and Workflow Designer.
  - `@dnd-kit`: Powers the App Builder canvas.
  - `Recharts / ECharts`: Powers the Dashboards and Analytics modules.

## 3. File Structure
- `src/App.tsx`: The main Studio shell and primary router.
- `src/components/Reports/ReportViewer.tsx`: Structured reporting engine with grouping, filtering, and export capabilities.
- `src/components/Dashboards/SalesDashboard.tsx`: Sample high-density sales dashboard with KPIs and Recharts integration.
- `src/components/Integrations/TrimbleConnectView.tsx`: AEC project browser and BCF issue tracker for Trimble Connect integration.
- `src/components/HelpResources.tsx`: Unified documentation and release notes system.
- `src/components/DataStudio/SchemaView.tsx`: Interactive React Flow canvas for entity-relationship modelling.
- `src/components/AppBuilder/AppBuilder.tsx`: Visual drag-and-drop canvas for mobile/tablet/desktop construction.
- `src/components/AIAssistant.tsx`: Persistent side panel for the AI Developer Assistant.
- `src/types.ts`: Core domain models for Tables, Fields, Apps, and Components.
- `src/store/`: Zustand stores for platform-wide state (Schema, App Config).
- `src/lib/utils.ts`: Standard utility helpers (cn).
- `src/index.css`: Global NDL configuration.

## 4. Key UI Modules
### Reports & Data Views
- **Structured Viewer**: High-density tabular layouts with sticky headers.
- **Data Operations**: Client-side sorting, hierarchical grouping, and custom filtering.
- **Exports**: Integration placeholders for PDF, Excel, and CSV generation.

### Dashboards & Analytics
- **Live Widgets**: KPI tiles with trend indicators.
- **Visualizations**: Multi-chart layouts (Bar, Line, Pie) powered by Recharts.
- **Interaction**: Cross-filtering and data drilling through tabular deal lists.

### Trimble Connect Integration
- **Project Browser**: OAuth-secured connection to Trimble Connect projects.
- **Data Ingestion**: Support for BCF Topics (Issues), Organizer nodes, and Project Files.
- **Field Mapping**: Synchronize Trimble project data directly to Nexus internal tables.

### Help & Resources
- **User Documentation**: Searchable repository of platform guides.
- **Release Notes**: Chronological log of platform enhancements and fixes.

### Data Studio
- **Schema View**: Visual entity-relationship canvas. Support for custom table nodes and relation handles.
- **Table View**: Spreadsheet-like data editor.
- **Query Builder**: Visual SQL constructor.

### App Builder
- **Canvas**: Responsive WYSIWYG workspace with device toggles (Desktop, Tablet, Mobile).
- **Component Palette**: Categorized UI primitives (Layouts, Inputs, Displays).
- **Properties Panel**: Contextual configuration for selected elements.

### AI Developer Assistant
- **Context-Aware Chat**: Persistent side panel that understands the current editor state.
- **Inline Assistance**: Suggested formulas and SQL fragments based on schema metadata.

## 5. Data Models (Typescript)
```typescript
export interface Table {
  id: string;
  name: string;
  fields: Field[];
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
}
```

## 6. Keyboard Shortcuts
- `CMD + K`: Open AI App Builder / Command Palette.
- `CMD + Z`: Undo last action.
- `CMD + Shift + Z`: Redo last action.
- `CMD + S`: Save / Deploy snapshot.

## 7. Build and Deployment
- Developed as a Vite SPA.
- Infrastructure focuses on stateless horizontal scale.
- Deployment target is cloud-native containers.
