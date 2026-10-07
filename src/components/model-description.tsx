import Markdown, { defaultUrlTransform, type Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => <h2 className="mt-5 text-xl font-semibold text-foreground">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-5 text-lg font-semibold text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 text-base font-semibold text-foreground">{children}</h3>,
  p: ({ children }) => <p className="leading-7">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-2 pl-4">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-sm text-foreground">{children}</code>,
  pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">{children}</pre>,
  a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">{children}</a> : <span>{children}</span>,
  // Descriptions are text; remote images must not trigger unsolicited browser requests.
  img: ({ alt }) => <span>{alt}</span>,
};

export function ModelDescription({ description }: { description: string }) {
  return <div className="max-w-prose space-y-3 break-words text-base text-muted-foreground [overflow-wrap:anywhere]">
    <Markdown components={components} urlTransform={defaultUrlTransform}>{description}</Markdown>
    {/(?:\.{3}|…)\s*$/.test(description) && <p className="text-xs leading-relaxed">Description ends here in Kilo’s catalog; no further text is supplied.</p>}
  </div>;
}
