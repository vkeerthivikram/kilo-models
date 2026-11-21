"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@ui-sdk/react/button";
import { type AgentDestination, waitForAgentDestination } from "@/lib/agent-readiness";

type AgentLinkProps = ComponentProps<typeof Link> & { destination?: AgentDestination };

function startAfterAgentObservesPending(): Promise<void> {
  // The SDK samples a pressed button after two frames. Let it start waiting
  // while the link is still mounted so it can observe the final action state.
  return new Promise((resolve) => {
    if (document.hidden) window.setTimeout(resolve, 50);
    else requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export function AgentLink({ children, className, destination, onClick, onNavigate, ...props }: AgentLinkProps) {
  const router = useRouter();
  return (
    <Button className={className} render={<Link {...props} onNavigate={onNavigate} />}
      onClick={(event, details) => {
        onClick?.(event as Parameters<NonNullable<AgentLinkProps["onClick"]>>[0]);
        if (details.source !== "agent" || !destination || event.defaultPrevented) return;
        event.preventDefault();
        const href = event.currentTarget.getAttribute("href");
        if (!href) throw new Error("The navigation link has no destination.");
        let canceled = false;
        onNavigate?.({ preventDefault: () => { canceled = true; } });
        if (canceled) throw new Error("Navigation was canceled.");
        return startAfterAgentObservesPending().then(() => {
          if (props.replace) router.replace(href, { scroll: props.scroll });
          else router.push(href, { scroll: props.scroll });
          return waitForAgentDestination(destination, href);
        });
      }}>
      {children}
    </Button>
  );
}
