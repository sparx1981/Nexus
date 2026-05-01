import { collection } from 'firebase/firestore';
import { db } from './firebase';

export const getWorkspaceTablesCol = (workspaceId: string) => 
  collection(db, 'workspaces', workspaceId, 'tables');

export const getTablesCol = getWorkspaceTablesCol;

export const getWorkspaceAppsCol = (workspaceId: string) => 
  collection(db, 'workspaces', workspaceId, 'apps');

export const getWorkspaceRelationshipsCol = (workspaceId: string) => 
  collection(db, 'workspaces', workspaceId, 'relationships');

export const getTableRowsCol = (workspaceId: string, tableId: string) => 
  collection(db, 'workspaces', workspaceId, 'tableData', tableId, 'rows');

export const getDashboardsCol = (workspaceId: string) => 
  collection(db, 'workspaces', workspaceId, 'dashboards');

export const getReportsCol = (workspaceId: string) => 
  collection(db, 'workspaces', workspaceId, 'reports');
