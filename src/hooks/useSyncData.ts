import { useEffect } from 'react';
import { onSnapshot, query } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useSchemaStore } from '../store/schemaStore';
import { getTablesCol } from '../lib/collections';
import { handleFirestoreError, OperationType } from '../services/dataService';

export function useSyncData() {
  const { isAuthenticated, selectedProjectId } = useAuthStore();
  const { setTables } = useSchemaStore();

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return;

    console.log('useSyncData: Starting workspace data listener for', selectedProjectId);
    
    const q = query(getTablesCol(selectedProjectId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tables = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log(`useSyncData: Received ${tables.length} tables`);
      setTables(tables);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/tables`);
    });

    return () => {
        unsubscribe();
    };
  }, [isAuthenticated, selectedProjectId, setTables]);
}
