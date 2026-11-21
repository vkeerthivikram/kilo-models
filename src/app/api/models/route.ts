import { NextResponse } from "next/server";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { getCatalog, refreshCatalog } from "@/lib/get-models";
import { catalogErrorDiagnostic, type CatalogEnvelope } from "@/lib/catalog-freshness";

const compress = promisify(gzip);

async function catalogResponse(catalog: CatalogEnvelope, request?: Request) {
  // Store the canonical snapshot on the server, not in a CDN cache that a POST
  // refresh cannot invalidate. Negotiate compression independently of caching.
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json", Vary: "Accept-Encoding" });
  const weights = new Map(request?.headers.get("accept-encoding")?.toLowerCase().split(",").map((item) => {
    const [coding, quality] = item.trim().split(";", 2);
    return [coding.trim(), quality === undefined ? 1 : Number(/^\s*q\s*=\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*$/.exec(quality)?.[1])];
  }));
  const body = JSON.stringify(catalog);
  if (body.length >= 1024 && (weights.get("gzip") ?? weights.get("*") ?? 0) > 0) {
    headers.set("Content-Encoding", "gzip");
    return new NextResponse(new Uint8Array(await compress(body)), { headers });
  }
  return new NextResponse(body, { headers });
}

export async function GET(request?: Request) {
  try {
    return await catalogResponse(await getCatalog(), request);
  } catch (error) {
    console.error("Model catalog load failed", catalogErrorDiagnostic(error));
    return NextResponse.json(
      { error: "Unable to load model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request?: Request) {
  try {
    return await catalogResponse(await refreshCatalog(), request);
  } catch (error) {
    console.error("Model catalog refresh failed", catalogErrorDiagnostic(error));
    return NextResponse.json(
      { error: "Unable to refresh model catalog" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
