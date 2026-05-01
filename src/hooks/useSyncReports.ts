import { useEffect } from 'react';
import { onSnapshot, query } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useReportStore } from '../store/reportStore';
import { getReportsCol } from '../lib/collections';
import { handleFirestoreError, OperationType } from '../services/dataService';

export function useSyncReports() {
  const { isAuthenticated, selectedProjectId } = useAuthStore();
  const { setReports } = useReportStore();

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return;

    const q = query(getReportsCol(selectedProjectId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as any[];
      setReports(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/reports`);
    });

    return () => unsubscribe();
  }, [isAuthenticated, selectedProjectId, setReports]);
}
