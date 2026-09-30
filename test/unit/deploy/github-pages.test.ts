import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORKFLOW_PATH, pagesWorkflow, runGithubPages } from "../../../src/deploy/github-pages.ts";
import { runCli } from "../../../src/cli.ts";
import { BookError } from "../../../src/errors.ts";
import { fixture, tempDir } from "../../helpers/temp.ts";

const VERSION = (
  JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

/** A git repository holding the English fixture book in `bookDir` (".": at the root). */
function repository(bookDir = ".", webUrl?: string): { root: string; config: string } {
  const root = tempDir();
  mkdirSync(join(root, ".git"));
  const book = join(root, bookDir);
  cpSync(fixture("book-en"), book, { recursive: true });
  const config = join(book, "book.json");
  if (webUrl) {
    const json = JSON.parse(readFileSync(config, "utf8")) as Record<string, unknown>;
    writeFileSync(config, JSON.stringify({ ...json, web_url: webUrl }));
  }
  return { root, config };
}

describe("pagesWorkflow", () => {
  const workflow = pagesWorkflow({ version: "1.2.3", bookDir: ".", configFile: "book.json" });

  it("runs only when a version tag is pushed", () => {
    expect(workflow).toMatch(/^on:\n( {2}#.*\n)* {2}push:\n {4}tags: \["v\*"\]\n\n/m);
    expect(workflow).not.toContain("workflow_dispatch");
    expect(workflow).not.toMatch(/^ {4}branches:/m);
  });

  it("builds the web edition with the pinned md2book, then deploys it to Pages", () => {
    expect(workflow).toContain("npm install -g @thixpin/md2book@1.2.3\n");
    expect(workflow).toContain(
      'node "$(npm root -g)/@thixpin/md2book/node_modules/playwright/cli.js" install --with-deps chromium\n',
    );
    expect(workflow).toContain('run: md2book fonts --config "book.json"\n');
    expect(workflow).toContain("uses: actions/configure-pages@v5\n");
    expect(workflow).toContain('path: "dist/pages/web"\n');
    expect(workflow).toContain("uses: actions/deploy-pages@v5\n");
    expect(workflow).toContain("      pages: write\n      id-token: write\n");
    expect(workflow).toContain("url: ${{ steps.deployment.outputs.page_url }}\n");
  });

  it("uses the URL GitHub Pages reports when the book has no web_url", () => {
    expect(workflow).toContain(
      'run: md2book build web --config "book.json" --out dist/pages --web-url "${{ steps.pages.outputs.base_url }}/"\n',
    );
  });

  it("uses the book's web_url, for a custom domain", () => {
    const own = pagesWorkflow({
      version: "1.2.3",
      bookDir: ".",
      configFile: "book.json",
      webUrl: "https://book.example.com/",
    });
    expect(own).toContain('run: md2book build web --config "book.json" --out dist/pages\n');
    expect(own).not.toContain("--web-url");
    expect(own).toContain("# Site URL: web_url in book.json (https://book.example.com/).\n");
  });

  it("works in the book's folder and uploads its site", () => {
    const nested = pagesWorkflow({
      version: "1.2.3",
      bookDir: "books/my book",
      configFile: "b.json",
    });
    expect(nested).toContain('        working-directory: "books/my book"\n');
    expect(nested).toContain('path: "books/my book/dist/pages/web"\n');
    expect(nested).toContain('run: md2book fonts --config "b.json"\n');
  });
});

describe("runGithubPages", () => {
  it("writes the workflow at the repository root, pinned to this md2book", async () => {
    const { root, config } = repository("books/novel");
    const { file, webUrl } = await runGithubPages({ config }, VERSION);
    expect(file).toBe(join(root, WORKFLOW_PATH));
    expect(webUrl).toBeUndefined();
    const workflow = readFileSync(file, "utf8");
    expect(workflow).toBe(
      pagesWorkflow({ version: VERSION, bookDir: "books/novel", configFile: "book.json" }),
    );
  });

  it("carries the book's web_url into the workflow", async () => {
    const { config } = repository(".", "https://book.example.com/");
    const { file, webUrl } = await runGithubPages({ config }, VERSION);
    expect(webUrl).toBe("https://book.example.com/");
    expect(readFileSync(file, "utf8")).not.toContain("--web-url");
  });

  it("never replaces a workflow without --force", async () => {
    const { root, config } = repository();
    const file = join(root, WORKFLOW_PATH);
    mkdirSync(join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(file, "mine");
    await expect(runGithubPages({ config }, VERSION)).rejects.toEqual(
      new BookError(file, "already exists; use --force to replace it"),
    );
    expect(readFileSync(file, "utf8")).toBe("mine");
    await runGithubPages({ config, force: true }, VERSION);
    expect(readFileSync(file, "utf8")).toContain("name: Deploy web edition to GitHub Pages");
  });

  it("stops outside a git repository", async () => {
    const dir = tempDir();
    cpSync(fixture("book-en"), dir, { recursive: true });
    const config = join(dir, "book.json");
    await expect(runGithubPages({ config }, VERSION)).rejects.toEqual(
      new BookError(
        config,
        "not inside a git repository; run git init and add a GitHub remote first",
      ),
    );
    expect(existsSync(join(dir, ".github"))).toBe(false);
  });
});

describe("md2book deploy github-pages", () => {
  it("writes the workflow and says what to do next", async () => {
    const { root, config } = repository();
    const out: string[] = [];
    const code = await runCli(["deploy", "github-pages", "-c", config], {
      stdout: (s) => out.push(s),
      stderr: () => {},
    });
    expect(code).toBe(0);
    expect(out.join("")).toContain(`created ${join(root, WORKFLOW_PATH)}\n`);
    expect(out.join("")).toContain("Source: GitHub Actions");
    expect(out.join("")).toContain("add a tag rule v*");
    expect(out.join("")).toContain("git tag v1.0.0 && git push origin v1.0.0");
  });
});
