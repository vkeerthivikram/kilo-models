import { NextResponse } from "next/server";
import { getCatalog, refreshCatalog } from "@/lib/get-models";

export async function GET() {
  try {
    return NextResponse.json(await getCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Unable to load model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST() {
  try {
    return NextResponse.json(await refreshCatalog(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Unable to refresh model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
