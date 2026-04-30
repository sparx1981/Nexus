# Nexus Product Specification

> **Last Updated:** 2026-04-30 | **Changed:** Finalized full platform feature set including Interactive Dashboards, AI Chat, Trimble Connect, and Workflow Designer.

## 1. Executive Summary
Nexus is a cloud-native low-code platform. It enables the creation of data-driven business applications with a focus on AI-first development and modern data connectivity.

## 2. Architecture Overview
- **Frontend**: React 18 SPA with Vite and Tailwind CSS.
- **State Management**: Zustand for editor state and auth.
- **AI**: Gemini 1.5 Flash via `@google/generative-ai` for specialized chat and scaffold generation.
- **Design System**: Nexus Design Language (NDL) based on Inter (sans).

## 3. Module Specifications

### Data Studio
- **Schema View**: React Flow canvas. Add tables/fields. Handle E-R mapping.
- **Table View**: Inline editable spreadsheet for raw data management.
- **Query Builder**: Visual filter/sort logic for data extraction.
- **Sources**: Connector management for internal and external (Snowflake/BigQuery) data.

### Workflows (Visual Designer)
- **Palette**: Triggers (Record Created/Updated), Actions (Send Email, API Call), Logic (Condition).
- **Canvas**: Drag-and-drop React Flow workspace.
- **Properties**: Context-aware configuration panel for selected nodes.

### Reports Engine
- **Report Selector**: Switch between Revenue, Inventory, and Compliance reports.
- **Interactions**: Client-side Search, Status Filtering, Multi-column Sorting.
- **Exports**: Live CSV generation; simulated Excel/PDF downloads with progress feedback.

### Interactive Dashboards
- **KPI Tiles**: Real-time metric cards with trend micro-charts.
- **Cross-Dashboard Switching**: Toggle between Sales Performance and Operations Overview.
- **Visuals**: Responsive Bar/Line/Pie charts using Recharts with hover tooltips and segment drilling.

### Trimble Connect Integration
- **Project Selection**: Switch context between different AEC projects.
- **BCF Coordination**: Live sync of coordination topics (Issues) with priority status.
- **Field Mapping**: Logic to map Trimble metadata directly to Nexus application entities.

### AI Developer Assistant
- **Schema Awareness**: AI reads `tables` state to provide contextual build advice.
- **Chat**: Persistent side panel with message history and typing indicators.

## 4. File Structure
- `src/App.tsx`: Main Studio shell, global search, and notification system.
- `src/store/schemaStore.ts`: Primary state for data models and node positioning.
- `src/components/Workflows/WorkflowDesigner.tsx`: The workflow orchestration canvas.
- `src/components/Reports/ReportViewer.tsx`: Data-dense tabular reporting.
- `src/components/Dashboards/SalesDashboard.tsx`: High-density visualization suite.
- `src/components/Integrations/TrimbleConnectView.tsx`: Trimble Connect project interface.
- `src/services/geminiService.ts`: AI orchestration layer.

## 5. Data Models
```typescript
export interface Table {
  id: string;
  name: string;
  fields: Field[];
  position?: { x: number; y: number };
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  RELATION = 'relation',
  AUTO_NUMBER = 'auto_number',
  EMAIL = 'email',
  URL = 'url'
}
```

## 6. Keyboard Shortcuts
- `Enter`: Submit text in AI Assistant.
- `Click + Drag`: Reposition tables in Schema or nodes in Workflows.
- `Search Input (Header)`: Jump to any module or resource.

## 7. Build and Deployment
- Developed as a Vite SPA.
- Port 3000 requirement for AI Studio environment.
- Environment variables required for Gemini API.
