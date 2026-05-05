export type DashboardCardType = 'kpi' | 'bar' | 'line' | 'pie' | 'table';

export interface DashboardCard {
    id: string;
    type: DashboardCardType;
    title: string;
    dataSourceId: string; // The table ID in Firestore
    config: {
        fieldX?: string;
        fieldY?: string;
        operation?: 'sum' | 'count' | 'avg' | 'min' | 'max';
        color?: string;
        kpiField?: string;
        tableFields?: string[];
        showTrend?: boolean;
    };
    position?: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    published?: boolean;
    cards: DashboardCard[];
    createdAt: any;
    updatedAt?: any;
}
