/** Matches `public.erp_po_headers` in docs/database/schema.sql */
export type ErpPoHeader = {
  po_number: string;
  vendor_code: string;
  created_at: string;
};

/** Matches `public.erp_po_items` in docs/database/schema.sql */
export type ErpPoItem = {
  id: string;
  po_number: string | null;
  part_number: string;
  part_name: string;
  quantity_ordered: number;
  unit: string | null;
};

export type ErpPoDetail = {
  header: ErpPoHeader;
  items: ErpPoItem[];
};
