import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToString, renderToStream } from "../dist/index.js";
import { TimerDOP } from "obix-fixture-timer";

test("renderToString works from artifact.render", () => {
  const html = renderToString(TimerDOP);
  assert.match(html, /Timer__display/);
  assert.match(html, /00:00/);
});

test("renderToString reflects state at the terminal", () => {
  const html = renderToString(TimerDOP, { state: { seconds: 5, running: false } });
  assert.match(html, /Finished/);
  assert.match(html, /Time&#39;s up/);
});

test("the built SSR module references no DOM globals", () => {
  const src = readFileSync(fileURLToPath(new URL("../dist/index.js", import.meta.url)), "utf8");
  for (const tok of ["document", "window", "HTMLElement", "addEventListener"]) {
    assert.doesNotMatch(src, new RegExp(`\\b${tok}\\b`), `SSR must not reference ${tok}`);
  }
});

test("renderToStream throws UnsupportedFeatureError (Level 1)", () => {
  assert.throws(() => renderToStream(), /Level 1/);
});

import { renderDocument, toView } from "../dist/index.js";

test("renderDocument returns the markup and the exact state it was rendered from (initial state by default, or the one given)", () => {
  const initial = renderDocument(TimerDOP);
  assert.deepEqual(initial.state, TimerDOP.initialState);
  assert.equal(initial.name, "Timer");
  assert.equal(initial.html, renderToString(TimerDOP));
  const done = renderDocument(TimerDOP, { state: { seconds: 5, running: false } });
  assert.deepEqual(done.state, { seconds: 5, running: false });
  assert.match(done.html, /Finished/);
});

test("renderDocument has no `trace` option: replaying a recorded trace is not part of this API (D-14); an option of that name is ignored, not honoured", () => {
  const doc = renderDocument(TimerDOP, { trace: [["Start"], ["Tick"]] });
  assert.deepEqual(doc.state, TimerDOP.initialState);
});

test("toView exposes state, frozen props and derived values without rendering", () => {
  const view = toView(TimerDOP, { state: { seconds: 5, running: false }, props: { limitSeconds: 5 } });
  assert.deepEqual(view.state, { seconds: 5, running: false });
  assert.equal(view.props.limitSeconds, 5);
  assert.equal(view.derived.statusLabel, "Finished");
  assert.equal(Object.isFrozen(view.props), true);
  assert.deepEqual(Object.keys(toView(TimerDOP)).sort(), ["derived", "props", "state"]);
});
