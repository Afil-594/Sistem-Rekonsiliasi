-- RLS helpers for Purchase Order tables (Superadmin create via web app)
-- -----------------------------------------------------------------------------
-- Run in Supabase SQL Editor only after reviewing your existing policies.
-- This project reads/writes `erp_po_headers` and `erp_po_items` from the app.
-- If these tables already have RLS enabled, merge with your policies instead
-- of applying blindly.
--
-- Goals:
-- - Authenticated users can read PO data (matches current app behavior for vendors).
-- - Only profiles.role = 'superadmin' can insert into ERP PO tables (MVP: create PO UI).

-- Enable RLS (omit if already enabled)
alter table public.erp_po_headers enable row level security;
alter table public.erp_po_items enable row level security;

-- ---------------------------------------------------------------------------
-- Optional: drop previous names if you are iterating (comment out if fresh)
-- drop policy if exists "erp_po_headers_select_authenticated" on public.erp_po_headers;
-- drop policy if exists "erp_po_items_select_authenticated" on public.erp_po_items;
-- drop policy if exists "erp_po_headers_insert_superadmin" on public.erp_po_headers;
-- drop policy if exists "erp_po_items_insert_superadmin" on public.erp_po_items;
-- ---------------------------------------------------------------------------

create policy "erp_po_headers_select_authenticated"
  on public.erp_po_headers
  for select
  to authenticated
  using (true);

create policy "erp_po_items_select_authenticated"
  on public.erp_po_items
  for select
  to authenticated
  using (true);

create policy "erp_po_headers_insert_superadmin"
  on public.erp_po_headers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'superadmin'
    )
  );

create policy "erp_po_items_insert_superadmin"
  on public.erp_po_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'superadmin'
    )
  );

-- Note: Updates/deletes are not granted here (aligns with MVP: create-only UI).
-- If you seed PO via SQL editor, use service role or temporary broader policies.
