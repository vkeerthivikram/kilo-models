"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ModelError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="container mx-auto px-4 py-16 space-y-4">
      <h1 className="font-heading text-3xl">Unable to load this model</h1>
      <p className="text-muted-foreground">The model catalog is temporarily unavailable. Try again in a moment.</p>
      <div className="flex items-center gap-4">
        <Button onClick={retry}>Try again</Button>
        <Link href="/" className="text-sm underline underline-offset-4">Back to directory</Link>
      </div>
    </main>
  );
}
