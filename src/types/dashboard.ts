export type DashboardCardType = 'kpi' | 'bar' | 'line' | 'pie' | 'table';

export interface DashboardCard {
    id: string;
    type: DashboardCardType;
    title: string;
    dataSourceId: string; // The table ID in Firestore
    config: {
        fieldX?: string;
        fieldY?: string;
        fieldB?: string;
        operation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'days_since' | 'days_between';
        color?: string;
        kpiField?: string;
        kpiOperation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'days_since' | 'days_between';
        tableFields?: string[];
        showTrend?: boolean;
        headerBg?: string;
    };
    position?: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    cards: DashboardCard[];
    createdAt: any;
    updatedAt?: any;
    isPublished?: boolean;
    publishedVersion?: {
        name: string;
        description?: string;
        cards: DashboardCard[];
        publishedAt: any;
    };
}
