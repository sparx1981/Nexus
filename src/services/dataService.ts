import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  setDoc,
  collectionGroup,
  query,
  where
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dataService = {
  // Tables
  async createTable(wsId: string, table: any) {
    const path = `workspaces/${wsId}/tables`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...table,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateTable(wsId: string, tableId: string, updates: any) {
    const path = `workspaces/${wsId}/tables/${tableId}`;
    try {
      await setDoc(doc(db, path), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteTable(wsId: string, tableId: string) {
    const path = `workspaces/${wsId}/tables/${tableId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Records
  async addRecord(wsId: string, tableId: string, data: any) {
    const path = `workspaces/${wsId}/tableData/${tableId}/rows`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateRecord(wsId: string, tableId: string, recordId: string, data: any) {
    const path = `workspaces/${wsId}/tableData/${tableId}/rows/${recordId}`;
    try {
      await setDoc(doc(db, path), {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteRecord(wsId: string, tableId: string, recordId: string) {
    const path = `workspaces/${wsId}/tableData/${tableId}/rows/${recordId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Dashboards
  async createDashboard(wsId: string, dashboard: any) {
    const path = `workspaces/${wsId}/dashboards`;
    try {
      const docRef = await addDoc(collection(db, path), {
        ...dashboard,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateDashboard(wsId: string, dashboardId: string, updates: any) {
    const path = `workspaces/${wsId}/dashboards/${dashboardId}`;
    try {
      await setDoc(doc(db, path), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteDashboard(wsId: string, dashboardId: string) {
    const path = `workspaces/${wsId}/dashboards/${dashboardId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
