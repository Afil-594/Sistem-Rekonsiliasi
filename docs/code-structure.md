# Code Structure Guide

This project uses Next.js + TypeScript + Supabase with the `src/` directory structure.

## Directory Rules

### `src/app/`
Use for Next.js pages and API routes only.

- UI pages go inside route folders in `src/app/`
- API endpoints go inside `src/app/api/`

Do not place heavy business logic directly inside page files or API route files.

### `src/app/api/`
Use for route handlers only.

Current API groups:
- `src/app/api/shipments/`
- `src/app/api/boxes/`
- `src/app/api/discrepancies/`

Each route should stay thin:
- validate input
- call service
- return response

### `src/components/`
Use for reusable UI components only.

Structure:
- `src/components/shipments/`
- `src/components/boxes/`
- `src/components/discrepancies/`
- `src/components/shared/`

Do not place database queries or business logic here.

### `src/lib/supabase/`
Use for Supabase setup only.

Examples:
- client creation
- server client creation
- auth/session helpers

### `src/lib/services/`
Use for business logic.

Examples:
- create shipment
- confirm shipment
- create snapshots
- scan box
- QC box
- create discrepancy
- review discrepancy

Keep service functions explicit and readable.

### `src/lib/queries/`
Use for direct database queries.

Examples:
- fetch shipment by id
- fetch boxes by shipment
- insert discrepancy
- fetch PO items

### `src/lib/utils/`
Use for small pure helpers.

Examples:
- generate codes
- formatters
- shared validators

### `src/lib/constants/`
Use for constants only.

Examples:
- status values
- fixed labels

### `src/types/`
Use for TypeScript types only.

Examples:
- shipment types
- box types
- discrepancy types
- database related types

### `docs/database/schema.sql`
This is the source of truth for database table names and column names.

Always follow this file exactly.
Do not invent new table or column names.

### `docs/system-context.md`
This is the source of truth for business flow and system meaning.

Follow this file for:
- actor responsibilities
- shipment flow
- box flow
- discrepancy handling

## Important Rules

- Do not over-engineer.
- Do not create unnecessary files.
- Do not place business logic inside page files.
- Do not place Supabase queries inside UI components.
- Do not invent new naming outside `docs/database/schema.sql`.
- If unsure where code belongs, prefer:
  - DB query -> `src/lib/queries`
  - business logic -> `src/lib/services`
  - UI -> `src/components`
  - route handler -> `src/app/api`