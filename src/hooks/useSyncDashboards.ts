import { useEffect } from 'react';
import { onSnapshot, query } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { getDashboardsCol } from '../lib/collections';
import { handleFirestoreError, OperationType } from '../services/dataService';

export function useSyncDashboards() {
  const { isAuthenticated, selectedProjectId } = useAuthStore();
  const { setDashboards } = useDashboardStore();

  useEffect(() => {
    if (!isAuthenticated || !selectedProjectId) return;

    console.log('useSyncDashboards: Starting listener for', selectedProjectId);
    
    const q = query(getDashboardsCol(selectedProjectId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dashboards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log(`useSyncDashboards: Received ${dashboards.length} dashboards`);
      setDashboards(dashboards);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `workspaces/${selectedProjectId}/dashboards`);
    });

    return () => {
        unsubscribe();
    };
  }, [isAuthenticated, selectedProjectId, setDashboards]);
}
