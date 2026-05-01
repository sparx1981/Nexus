import React, { useState } from 'react';
import { DashboardList } from './DashboardList';
import { DashboardDesigner } from './DashboardDesigner';
import { useDashboardStore } from '../../store/dashboardStore';
import { useAuthStore } from '../../store/authStore';

export const DashboardSection = () => {
    const { dashboards, addDashboard, deleteDashboard } = useDashboardStore();
    const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
    const { selectedProjectId } = useAuthStore();

    const handleCreate = async () => {
        if (!selectedProjectId) return;
        const id = `dash_${Date.now()}`;
        const newDash = {
            id,
            name: 'New Dashboard',
            description: 'Workspace analytics and insights.',
            workspaceId: selectedProjectId,
            cards: [],
            createdAt: new Date().toISOString()
        };
        await addDashboard(newDash);
        setSelectedDashboardId(id);
    };

    const selectedDashboard = dashboards.find(d => d.id === selectedDashboardId);

    if (selectedDashboard) {
        return (
            <DashboardDesigner 
                dashboard={selectedDashboard}
                onClose={() => setSelectedDashboardId(null)}
            />
        );
    }

    return (
        <DashboardList 
            dashboards={dashboards}
            onSelect={setSelectedDashboardId}
            onCreate={handleCreate}
            onDelete={deleteDashboard}
        />
    );
};
