import { modelDetailMetadata, renderModelDetail } from "@/components/model-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  return modelDetailMetadata((await params).id);
}

export default async function ModelPage({ params }: Props) {
  return renderModelDetail((await params).id);
}
