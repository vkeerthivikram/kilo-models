import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SpecificationShape } from "./capability-radar-chart";

test("profile renders confirmed zero but never joins unknown axes through the center", () => {
  const html = renderToStaticMarkup(<SpecificationShape points={[
    { x: 100, y: 0, value: 100 },
    { x: 100, y: 100, value: null },
    { x: 100, y: 100, value: 0 },
    { x: 0, y: 100, value: 100 },
  ]} stroke="#abc" fill="#abc" />);
  assert.equal((html.match(/<circle /g) ?? []).length, 3);
  assert.equal((html.match(/<line /g) ?? []).length, 2);
  assert.doesNotMatch(html, /<polygon/);
  assert.match(html, /cx="100" cy="100"/);
});
