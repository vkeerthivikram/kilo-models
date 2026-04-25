import { NextResponse } from "next/server";

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
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
