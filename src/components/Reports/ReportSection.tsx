import React, { useState } from 'react';
import { ReportList } from './ReportList';
import { ReportDesigner } from './ReportDesigner';
import { useReportStore } from '../../store/reportStore';
import { useAuthStore } from '../../store/authStore';

export const ReportSection = () => {
    const { reports, addReport, deleteReport } = useReportStore();
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const { selectedProjectId } = useAuthStore();

    const handleCreate = async () => {
        if (!selectedProjectId) return;
        const id = `report_${Date.now()}`;
        const newReport = {
            id,
            name: 'New Custom Report',
            description: 'A detailed data analysis report.',
            workspaceId: selectedProjectId,
            elements: [],
            createdAt: new Date().toISOString()
        };
        await addReport(newReport);
        setSelectedReportId(id);
    };

    const selectedReport = reports.find(r => r.id === selectedReportId);

    if (selectedReport) {
        return (
            <ReportDesigner 
                report={selectedReport}
                onClose={() => setSelectedReportId(null)}
            />
        );
    }

    return (
        <ReportList 
            reports={reports}
            onSelect={setSelectedReportId}
            onCreate={handleCreate}
            onDelete={deleteReport}
        />
    );
};
