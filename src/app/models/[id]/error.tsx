"use client";

import { BackToDirectory } from "@/components/back-to-directory";
import { Button } from "@/components/ui/button";

export default function ModelError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main data-model-detail-error="" className="container mx-auto px-4 py-16 space-y-4">
      <div role="alert" data-agent-catalog="Model detail unavailable" className="space-y-4">
        <h1 className="font-heading text-3xl">Unable to load this model</h1>
        <p className="text-muted-foreground">The model catalog is temporarily unavailable. Try again in a moment.</p>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={retry}>Try again</Button>
        <BackToDirectory />
      </div>
    </main>
  );
}
