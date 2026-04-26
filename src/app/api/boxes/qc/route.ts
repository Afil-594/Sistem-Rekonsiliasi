import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { qcBox, type QcBoxInput } from "@/lib/services/checker";
import type { DiscrepancyType } from "@/types/discrepancy";

function parseActualQty(value: FormDataEntryValue | unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let input: QcBoxInput;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const shipmentId =
        typeof formData.get("shipment_id") === "string"
          ? (formData.get("shipment_id") as string)
          : "";
      const boxId =
        typeof formData.get("box_id") === "string"
          ? (formData.get("box_id") as string)
          : "";
      const decision = formData.get("decision");

      if (decision !== "accepted" && decision !== "rejected") {
        return NextResponse.json(
          { error: "Keputusan QC tidak valid." },
          { status: 400 },
        );
      }

      if (decision === "accepted") {
        input = { shipmentId, boxId, decision: "accepted" };
      } else {
        const discrepancyType =
          typeof formData.get("discrepancy_type") === "string"
            ? (formData.get("discrepancy_type") as DiscrepancyType)
            : ("" as DiscrepancyType);
        const description =
          typeof formData.get("description") === "string"
            ? (formData.get("description") as string)
            : "";
        const actualQty = parseActualQty(formData.get("actual_qty"));
        const evidenceFile = formData.get("evidence");

        input = {
          shipmentId,
          boxId,
          decision: "rejected",
          discrepancyType,
          description,
          actualQty,
          evidenceFile: evidenceFile instanceof File ? evidenceFile : null,
        };
      }
    } else {
      const payload = (await request.json()) as Record<string, unknown>;
      const shipmentId =
        typeof payload.shipment_id === "string" ? payload.shipment_id : "";
      const boxId = typeof payload.box_id === "string" ? payload.box_id : "";
      const decision = payload.decision;

      if (decision !== "accepted" && decision !== "rejected") {
        return NextResponse.json(
          { error: "Keputusan QC tidak valid." },
          { status: 400 },
        );
      }

      if (decision === "accepted") {
        input = { shipmentId, boxId, decision: "accepted" };
      } else {
        const discrepancyType =
          typeof payload.discrepancy_type === "string"
            ? (payload.discrepancy_type as DiscrepancyType)
            : ("" as DiscrepancyType);
        const description =
          typeof payload.description === "string" ? payload.description : "";

        input = {
          shipmentId,
          boxId,
          decision: "rejected",
          discrepancyType,
          description,
          actualQty: parseActualQty(payload.actual_qty),
          evidenceFile: null,
        };
      }
    }
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  let result: Awaited<ReturnType<typeof qcBox>>;

  try {
    result = await qcBox(supabase, input);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memproses QC box.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ data: result.data });
}
