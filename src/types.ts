/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EntityType {
  TABLE = 'table',
  QUERY = 'query',
  CONNECTOR = 'connector',
}

export enum FieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  DATE_TIME = 'datetime',
  BOOLEAN = 'boolean',
  SINGLE_SELECT = 'single_select',
  MULTI_SELECT = 'multi_select',
  RELATION = 'relation',
  FORMULA = 'formula',
  FILE = 'file',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  JSON = 'json',
  AUTO_NUMBER = 'auto_number',
  CALCULATED = 'calculated',
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  size?: number;
  precision?: number;
  scale?: number;
  dateFormat?: string;
  required?: boolean;
  options?: string[]; // For selects
  formula?: string;
  relationTarget?: string; // Table ID
  calculatedExpression?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  type?: 'internal' | 'csv' | 'api' | 'trimble';
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export enum ApplicationMode {
  VIEW_ONLY = 'view_only',
  ADD = 'add',
  UPDATE = 'update',
  DELETE = 'delete'
}

export interface AppConfig {
  id: string;
  name: string;
  description?: string;
  dataSourceId?: string;
  mode: ApplicationMode;
  keyFields: string[]; // Field IDs
  screens: ScreenConfig[];
}

export interface ScreenConfig {
  id: string;
  name: string;
  layout: any; // Simplified for now
  components: ComponentConfig[];
}

export interface ComponentConfig {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  dataBinding?: string; // Field reference
  position?: { x: number; y: number };
}

export interface CanvasState {
  components: ComponentConfig[];
  selectedId: string | null;
}
