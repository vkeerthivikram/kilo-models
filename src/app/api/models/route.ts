import { NextResponse } from "next/server";
import { parseModelsResponse } from "@/lib/models-response";

const MODELS_URL = "https://api.kilo.ai/api/gateway/models";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch(MODELS_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data: parseModelsResponse(data) });
  } catch {
    return NextResponse.json(
      { error: "Unable to load model catalog" },
      { status: 502 }
    );
  }
}
