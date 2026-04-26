-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  target_table text,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.boxes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_id uuid,
  box_code text NOT NULL UNIQUE,
  part_number text NOT NULL,
  qty_per_box integer NOT NULL CHECK (qty_per_box > 0),
  lot_number text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'arrived'::text, 'accepted'::text, 'rejected'::text])),
  CONSTRAINT boxes_pkey PRIMARY KEY (id),
  CONSTRAINT boxes_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id)
);
CREATE TABLE public.discrepancies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  box_id uuid,
  discrepancy_type text NOT NULL CHECK (discrepancy_type = ANY (ARRAY['missing'::text, 'over'::text, 'defect'::text, 'other'::text])),
  discrepancy_layer text CHECK (discrepancy_layer IS NULL OR discrepancy_layer = ANY (ARRAY['po_vendor'::text, 'arrival'::text, 'qc'::text])),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'reviewed'::text, 'resolved'::text])),
  reported_by uuid,
  reviewed_by uuid,
  supervisor_action text CHECK (supervisor_action = ANY (ARRAY['return'::text, 'none'::text])),
  reviewed_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  evidence_path text,
  actual_qty integer,
  CONSTRAINT discrepancies_pkey PRIMARY KEY (id),
  CONSTRAINT discrepancies_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id),
  CONSTRAINT discrepancies_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id),
  CONSTRAINT discrepancies_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id),
  CONSTRAINT discrepancies_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.erp_po_headers (
  po_number text NOT NULL,
  vendor_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_po_headers_pkey PRIMARY KEY (po_number)
);
CREATE TABLE public.erp_po_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text,
  part_number text NOT NULL,
  part_name text NOT NULL,
  quantity_ordered integer NOT NULL CHECK (quantity_ordered > 0),
  unit text DEFAULT 'pcs'::text,
  CONSTRAINT erp_po_items_pkey PRIMARY KEY (id),
  CONSTRAINT erp_po_items_po_number_fkey FOREIGN KEY (po_number) REFERENCES public.erp_po_headers(po_number)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role text CHECK (role = ANY (ARRAY['vendor'::text, 'checker'::text, 'supervisor'::text, 'superadmin'::text])),
  vendor_code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.shipment_box_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL,
  box_code text NOT NULL,
  part_number text NOT NULL,
  qty_per_box integer NOT NULL CHECK (qty_per_box > 0),
  lot_number text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipment_box_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT shipment_box_snapshots_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id)
);
CREATE TABLE public.shipment_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_id uuid,
  part_number text NOT NULL,
  part_name text NOT NULL,
  expected_qty integer NOT NULL CHECK (expected_qty > 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipment_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT shipment_snapshots_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id)
);
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shipment_code text NOT NULL UNIQUE,
  po_reference text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_transit'::text, 'arrived'::text, 'issue'::text, 'done'::text])),
  vendor_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipments_pkey PRIMARY KEY (id),
  CONSTRAINT shipments_po_reference_fkey FOREIGN KEY (po_reference) REFERENCES public.erp_po_headers(po_number),
  CONSTRAINT shipments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.profiles(id)
);