import { BackToDirectory } from "@/components/back-to-directory";

export default function ModelNotFound() {
  return (
    <main data-model-detail-error="" className="container mx-auto px-4 py-16 space-y-4">
      <div role="alert" data-agent-catalog="Model detail unavailable" className="space-y-4">
        <h1 className="font-heading text-3xl">Model not found</h1>
        <p className="text-muted-foreground">This model is unavailable in the current catalog.</p>
      </div>
      <BackToDirectory />
    </main>
  );
}
