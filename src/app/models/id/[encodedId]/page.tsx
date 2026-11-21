import { notFound } from "next/navigation";
import { modelDetailMetadata, renderModelDetail } from "@/components/model-detail-page";
import { decodeExactModelId } from "@/lib/model-detail-path";

interface Props {
  params: Promise<{ encodedId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const id = decodeExactModelId((await params).encodedId);
  return id === null ? {} : modelDetailMetadata(id, true);
}

export default async function ExactModelPage({ params }: Props) {
  const id = decodeExactModelId((await params).encodedId);
  if (id === null) notFound();
  return renderModelDetail(id, true);
}
