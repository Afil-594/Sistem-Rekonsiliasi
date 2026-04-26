/** Matches `public.boxes` in docs/database/schema.sql */
export type Box = {
  id: string;
  shipment_id: string | null;
  box_code: string;
  part_number: string;
  qty_per_box: number;
  lot_number: string;
  status: "pending" | "arrived" | "accepted" | "rejected" | null;
};

export type BoxInsertInput = {
  shipment_id: string;
  box_code: string;
  part_number: string;
  qty_per_box: number;
  lot_number: string;
};
