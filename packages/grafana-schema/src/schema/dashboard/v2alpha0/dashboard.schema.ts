import {
  AnnotationPanelFilter,
  DashboardCursorSync,
  DashboardLink,
  DataSourceRef,
  DataTransformerConfig,
  FieldConfigSource,
} from '../../../index.gen';

// This kind will not be necessary in the future, the k8s envelope will be provided through ScopedResourceClient
// See public/app/features/apiserver/client.ts
export type DashboardV2 = {
  kind: 'Dashboard';
  spec: DashboardSpec;
};

interface DashboardSpec {
  id?: number;

  // dashboard settings
  title: string;
  description: string;
  cursorSync: DashboardCursorSync;
  liveNow: boolean;
  preload: boolean;
  editable: boolean;
  links: DashboardLink[];
  tags: string[];
  // EOf dashboard settings

  timeSettings: TimeSettingsSpec;
  variables: Array<QueryVariableKind | TextVariableKind /* | ... */>;
  elements: Referenceable;
  annotations: AnnotationQueryKind[];
  layout: GridLayoutKind;

  // version: will rely on k8s resource versioning, via metadata.resorceVersion

  // revision?: number; // for plugins only
  // gnetId?: string; // ??? Wat is this used for?
}

/**
 * ---- Kinds ----
 */

export interface VizConfigSpec {
  pluginVersion: string;
  options: Record<string, unknown>;
  fieldConfig: FieldConfigSource;
}

// Eventually this will become a plugin-specific kind, TimeSeriesConfigKind, BarChartConfigKind
// Since we don't have those kinds exposed from plugins anywhere ATM lets keep the interface open enough to allow union in the future
export type VizConfigKind = {
  kind: string;
  spec: VizConfigSpec;
};

interface AnnotationQuerySpec {
  datasource: DataSourceRef;
  query: DataQueryKind;

  // TODO: Should be figured out based on datasource (Grafana ds)
  // builtIn?: number;
  // Below are currently existing options for annotation queries
  enable: boolean;
  filter: AnnotationPanelFilter;
  hide: boolean;
  iconColor: string;
  name: string;
}

//  Represent Grafana dashboard annotations
export type AnnotationQueryKind = {
  kind: 'AnnotationQuery';
  spec: AnnotationQuerySpec;
};

export interface QueryOptionsSpec {
  timeFrom?: string;
  maxDataPoints?: number;
  timeShift?: string;
  queryCachingTTL?: number;
  interval?: string;
  cacheTimeout?: string;
}

/**
 * Represents an idividial query for a given data source type.
 * The kind is the plugin id.
 *
 * For example:
 * {
 *  kind: 'prometheus', // kind is plugin id!
 *  spec: {
 *   query: 'up',
 *   ...
 *  }
 */
type DataQueryKind = {
  kind: string;
  spec: Record<string, unknown>;
};

// Represents an idividual query for a given panel. Used within a QueryGroupKind.
interface PanelQuerySpec {
  query: DataQueryKind;
  datasource: DataSourceRef;

  refId: string;
  hidden: boolean;
}

type PanelQueryKind = {
  kind: 'PanelQuery';
  spec: PanelQuerySpec;
};

/**
 * Represents a transformation, used within a QueryGroupKind
 * For example:
 * {
 *  kind: 'limitTransformation',
 *  spec: {
 
 *   ...
 *  }
 */
type TransformationKind = {
  kind: string;
  spec: DataTransformerConfig;
};

// Represents a group of queries with transformations and query group options
export interface QueryGroupSpec {
  queries: PanelQueryKind[];
  transformations: TransformationKind[];
  queryOptions: QueryOptionsSpec;
}
export type QueryGroupKind = {
  kind: 'QueryGroup';
  spec: QueryGroupSpec;
};

// TODO: Provide precise specs for each individual variable types
export interface QueryVariableSpec {}
export type QueryVariableKind = {
  kind: 'QueryVariable';
  spec: QueryVariableSpec;
};

export interface TextVariableSpec {}
export type TextVariableKind = {
  kind: 'TextVariable';
  spec: TextVariableSpec;
};

// Encapsulates time settings for a dashboard
export interface TimeSettingsSpec {
  timezone: string;
  from: string;
  to: string;
  autoRefresh: string; //v1: refresh
  autoRefreshIntervals: string[]; // v1: timepicker.refresh_intervals
  quickRanges: string[]; // v1: timepicker.time_options , not exposed in the UI
  hideTimepicker: boolean; // v1: timepicker.hidden
  weekStart: string;
  fiscalYearStartMonth: number;
  nowDelay?: string; // v1: timepicker.nowDelay
}

//  Represents an individual grid item within a GridLayout
interface GridLayoutItemSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  element: Reference; // reference to a PanelKind from dashboard.spec.elements Expressed as JSON Schema reference
}
export type GridLayoutItemKind = {
  kind: 'GridLayoutItem';
  spec: GridLayoutItemSpec;
};

// Represents a grid layout within a dashboard
export interface GridLayoutSpec {
  items: GridLayoutItemKind[];
}
export type GridLayoutKind = {
  kind: 'GridLayout';
  spec: GridLayoutSpec;
};

// Represents a panel within a dashboard, including viz plugin configuration
// and data queries with transformations & query options.
interface PanelSpec {
  uid: string;
  title: string;
  description: string;
  links: DashboardLink[];
  data: QueryGroupKind;
  vizConfig: VizConfigKind;
}

export type PanelKind = {
  kind: 'Panel';
  spec: PanelSpec;
};

// Just to know they exist, they can't be used to define the plan TS
// export interface Kind {
//   kind: string;
//   metadata?: Record<string, unknown>;
//   spec: Record<string, unknown>;
// }

export type Reference = {
  $ref: string;
};

export type Referenceable = Record<string, unknown>;
