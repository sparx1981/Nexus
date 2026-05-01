import { collection } from 'firebase/firestore';
import { db } from './firebase';


export const getTablesCol = (wsId: string) => collection(db, 'workspaces', wsId, 'tables');
export const getAppsCol = (wsId: string) => collection(db, 'workspaces', wsId, 'apps');
export const getDashboardsCol = (wsId: string) => collection(db, 'workspaces', wsId, 'dashboards');
export const getReportsCol = (wsId: string) => collection(db, 'workspaces', wsId, 'reports');
export const getWorkflowsCol = (wsId: string) => collection(db, 'workspaces', wsId, 'workflows');
export const getConnectorsCol = (wsId: string) => collection(db, 'workspaces', wsId, 'connectors');
export const getTableDataCol = (wsId: string, tableId: string) => collection(db, 'workspaces', wsId, 'tableData', tableId, 'rows');
