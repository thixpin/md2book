import { describe, expect, it } from "vitest";
import { defaultStrings } from "../../../src/config/language.ts";
import { convertCallouts } from "../../../src/markdown/callouts.ts";

const titles = defaultStrings("en", "sans").callout_titles;

describe("convertCallouts", () => {
  it.each([
    ["NOTE", "note", "Note"],
    ["WARNING", "warning", "Warning"],
    ["TRY", "try", "Try it yourself"],
    ["note", "note", "Note"],
  ])("turns [!%s] into a %s callout", (marker, kind, title) => {
    expect(convertCallouts(`<blockquote>\n<p>[!${marker}]\nBody.</p>\n</blockquote>`, titles)).toBe(
      `<div class="callout callout-${kind}"><p class="callout-title">${title}</p><p>Body.</p></div>`,
    );
  });

  it("removes an empty leading paragraph", () => {
    expect(
      convertCallouts("<blockquote>\n<p>[!NOTE]</p>\n<p>Body.</p>\n</blockquote>", titles),
    ).toBe('<div class="callout callout-note"><p class="callout-title">Note</p><p>Body.</p></div>');
  });

  it("uses configured titles", () => {
    expect(
      convertCallouts("<blockquote>\n<p>[!TRY]\nGo.</p>\n</blockquote>", {
        ...titles,
        try: "Do it",
      }),
    ).toContain('<p class="callout-title">Do it</p>');
  });

  it("leaves unknown kinds as blockquotes", () => {
    const html = "<blockquote>\n<p>[!TIP]\nBody.</p>\n</blockquote>";
    expect(convertCallouts(html, titles)).toBe(html);
  });
});
