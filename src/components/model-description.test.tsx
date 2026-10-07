import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModelDescription } from "./model-description";

test("descriptions render readable Markdown with safe links and page heading hierarchy", () => {
  const html = renderToStaticMarkup(<ModelDescription description={'# Model notes\n\n**Warning:** preview only.\n\n- Fast\n- [Docs](https://example.com/docs)\n\n> Check limits.\n\n`tokens`'} />);
  assert.match(html, /<h2[^>]*>Model notes<\/h2>/);
  assert.match(html, /<strong>Warning:<\/strong>/);
  assert.match(html, /<ul/);
  assert.match(html, /href="https:\/\/example.com\/docs"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<blockquote/);
  assert.match(html, /<code/);
});

test("upstream HTML, scripts, dangerous URLs and remote images cannot execute", () => {
  const html = renderToStaticMarkup(<ModelDescription description={'<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[Bad](javascript:alert%281%29) [Data](data:text/html,bad) ![Chart](https://example.com/chart.png)'} />);
  assert.doesNotMatch(html, /<script|<img|href="javascript:|href="data:/);
  assert.match(html, /Bad/);
  assert.match(html, /Chart/);
});
