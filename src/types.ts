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
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // For selects
  formula?: string;
  relationTarget?: string; // Table ID
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface AppConfig {
  id: string;
  name: string;
  description?: string;
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
  properties: Record<string, any>;
  dataBinding?: string; // Field reference
}
