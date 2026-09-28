import { decodeHTML } from "entities";
import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";
import { escapeHtml } from "../manuscript/text.ts";

loadLanguages.silent = true;
loadLanguages();

/**
 * Prism token type (or alias) → Pygments short class, so the existing stylesheets apply
 * unchanged (research R-03). Unmapped types render as plain text.
 */
const CLASSES: Record<string, string> = {
  keyword: "k",
  boolean: "kc",
  string: "s2",
  char: "sc",
  regex: "sr",
  number: "mi",
  comment: "c1",
  function: "nf",
  "class-name": "nc",
  builtin: "nb",
  decorator: "nd",
  variable: "nv",
};

const TERMINAL_LANGS = new Set(["console", "terminal", "shell-session"]);
const TERMINAL_BAR =
  '<div class="terminal-bar"><span class="terminal-dot"></span>' +
  '<span class="terminal-dot"></span><span class="terminal-dot"></span></div>';
const FENCED_RE = /<pre><code class="language-([\w+#.-]+)">([\s\S]*?)<\/code><\/pre>/g;

function tokenClass(token: Prism.Token): string | undefined {
  const aliases = token.alias ? [token.alias].flat() : [];
  for (const name of [token.type, ...aliases]) {
    if (CLASSES[name]) return CLASSES[name];
  }
  return undefined;
}

function renderTokens(stream: Prism.TokenStream): string {
  if (typeof stream === "string") return escapeHtml(stream);
  if (Array.isArray(stream)) return stream.map(renderTokens).join("");
  const inner = renderTokens(stream.content);
  const cls = tokenClass(stream);
  return cls ? `<span class="${cls}">${inner}</span>` : inner;
}

function grammar(lang: string): Prism.Grammar | undefined {
  const value: unknown = Prism.languages[lang];
  return value && typeof value === "object" ? value : undefined;
}

function highlight(code: string, lang: string): string {
  return renderTokens(Prism.tokenize(code, grammar(lang)!));
}

/** `$ ` lines are prompt + bash command; everything else is output. */
function highlightConsole(code: string): string {
  const trailing = code.endsWith("\n");
  const lines = (trailing ? code.slice(0, -1) : code).split("\n");
  const out = lines.map((line) => {
    if (line.startsWith("$ "))
      return `<span class="gp">$ </span>${highlight(line.slice(2), "bash")}`;
    return line === "" ? "" : `<span class="go">${escapeHtml(line)}</span>`;
  });
  return out.join("\n") + (trailing ? "\n" : "");
}

/** Highlights rendered fenced blocks; unknown languages are left exactly as rendered. */
export function highlightFences(html: string): string {
  return html.replace(FENCED_RE, (match, rawLang: string, escaped: string) => {
    const lang = rawLang.toLowerCase();
    const code = decodeHTML(escaped);
    if (TERMINAL_LANGS.has(lang)) {
      return `<div class="terminal">${TERMINAL_BAR}<pre class="console"><code>${highlightConsole(code)}</code></pre></div>`;
    }
    if (!grammar(lang)) return match;
    return `<pre class="code"><code class="language-${lang}">${highlight(code, lang)}</code></pre>`;
  });
}
