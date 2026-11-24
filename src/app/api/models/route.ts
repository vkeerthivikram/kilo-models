import { NextResponse } from "next/server";
import { getCatalog, refreshCatalog } from "@/lib/get-models";
import { catalogErrorDiagnostic, type CatalogEnvelope } from "@/lib/catalog-freshness";

function catalogResponse(catalog: CatalogEnvelope) {
  // Keep the canonical snapshot in the server cache and let the host compress the JSON.
  return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    return catalogResponse(await getCatalog());
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
    return catalogResponse(await refreshCatalog());
  } catch (error) {
    console.error("Model catalog refresh failed", catalogErrorDiagnostic(error));
    return NextResponse.json(
      { error: "Unable to refresh model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
