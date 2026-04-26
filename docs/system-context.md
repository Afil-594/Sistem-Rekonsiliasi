# System Context

## Project
Shipment Verification & QC Traceability System for PT Indonesia Epson Industry.

## Main Goal
Build a web-based system to track shipment delivery from vendor to Epson warehouse, verify arrival, perform QC, record discrepancies, and provide auditability.

## Tech Stack
- Next.js
- TypeScript
- Supabase
- Mock ERP API for Purchase Order data

## Actors

### Vendor
- Sees active PO data that belongs to their vendor code
- Creates shipment from PO
- Splits items into boxes
- Confirms shipment
- Shipment confirmation locks final packing data

### Checker
- Verifies box arrival by scanning QR code
- Performs QC on the box
- Can mark box as accepted or rejected
- Can create discrepancy records with description

### Supervisor
- Reviews discrepancy records
- Decides follow-up action
- Current project scope focuses on `return`

### Superadmin
- Full access
- Can view audit logs

## Core Business Rules
- One box contains exactly one part type
- One shipment references one PO
- One PO can contain multiple parts
- Final packing is created before shipment confirmation
- Shipment confirmation locks the shipment data
- PO snapshot must be stored when shipment is confirmed
- Final packing snapshot per box must also be stored when shipment is confirmed
- Return applies only to problematic boxes/items, not the entire shipment
- Audit trail must record important user actions

## Main Flow

### 1. Vendor Preparation
- Vendor selects PO
- Vendor creates shipment
- Vendor creates box data
- Each box has unique `box_code`
- Each box stores:
  - part number
  - qty per box
  - lot number

### 2. Shipment Confirmation
When vendor confirms shipment:
- shipment status becomes `in_transit`
- `shipment_snapshots` is created from PO data
- `shipment_box_snapshots` is created from final box packing data
- packing data becomes locked

### 3. Arrival Verification
Checker scans each box QR code:
- if scanned, box status becomes `arrived`

### 4. QC Verification
Checker checks physical condition of the box/item:
- if OK, box status becomes `accepted`
- if problematic, box status becomes `rejected`
- checker creates a discrepancy record

### 5. Discrepancy Handling
Discrepancy may represent:
- missing
- over
- defect
- other

Each discrepancy stores:
- shipment reference
- optional box reference
- discrepancy type
- description from checker
- review status
- supervisor action

### 6. Supervisor Follow-Up
Supervisor reviews discrepancy:
- may set action to `return`
- resolves the discrepancy

## Status Definitions

### Shipment Status
- `pending` = shipment draft, not confirmed yet
- `in_transit` = shipment confirmed by vendor and on delivery
- `arrived` = shipment has arrived and inbound process is completed
- `issue` = shipment has one or more discrepancies needing follow-up
- `done` = shipment process is fully completed

### Box Status
- `pending` = box exists but has not been scanned yet
- `arrived` = box has been scanned and physically arrived
- `accepted` = box passed QC
- `rejected` = box failed QC or is problematic

### Discrepancy Status
- `open` = newly reported
- `reviewed` = reviewed by supervisor
- `resolved` = follow-up completed

## Database Meaning

### `erp_po_headers`
Stores PO header data from mock ERP.

### `erp_po_items`
Stores PO item details from mock ERP.

### `shipments`
Stores shipment document created by vendor.

### `shipment_snapshots`
Stores PO snapshot data at the moment shipment is confirmed.

### `boxes`
Stores operational box data for QR, scan, and QC process.

### `shipment_box_snapshots`
Stores final packing snapshot per box at the moment shipment is confirmed.

### `discrepancies`
Stores issues reported by checker or detected during verification.

### `audit_logs`
Stores important action logs for audit purposes.

### `profiles`
Stores user profile and role data.

## Implementation Notes
- Use exact table and column names from `docs/database/schema.sql`
- Do not invent new database naming unless explicitly requested
- Keep implementation simple
- Avoid unnecessary abstractions