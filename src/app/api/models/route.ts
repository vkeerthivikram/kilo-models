import { NextResponse } from "next/server";
import { getCatalog, refreshCatalog } from "@/lib/get-models";
import { catalogErrorDiagnostic } from "@/lib/catalog-freshness";

export async function GET() {
  try {
    return NextResponse.json(await getCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Model catalog load failed", catalogErrorDiagnostic(error));
    return NextResponse.json(
      { error: "Unable to load model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST() {
  try {
    return NextResponse.json(await refreshCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Model catalog refresh failed", catalogErrorDiagnostic(error));
    return NextResponse.json(
      { error: "Unable to refresh model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
