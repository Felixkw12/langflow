export type FlowVersionEntry = {
  id: string;
  flow_id: string;
  user_id: string;
  version_number: number;
  version_tag: string;
  description: string | null;
  created_at: string;
  /** The history revision this version's graph belongs to; null if saved before the flow had history. */
  operation_revision?: number | null;
  /** The kept original of a repaired flow: viewable and exportable, not restorable. */
  view_only?: boolean;
};

export type FlowVersionEntryWithData = FlowVersionEntry & {
  // biome-ignore lint/suspicious/noExplicitAny: legacy
  data: Record<string, any> | null;
};

export type FlowVersionCreate = {
  description?: string | null;
};

export type FlowVersionListResponse = {
  entries: FlowVersionEntry[];
  max_entries: number;
};
