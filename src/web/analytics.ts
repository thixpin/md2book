import type { z } from "zod";
import type { webAnalyticsSchema } from "../config/schema.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

export type WebAnalytics = z.infer<typeof webAnalyticsSchema>;

/**
 * Opt-in analytics for the web edition (`web_analytics`): the provider's own tag, and a small
 * glue script that turns the reader's chapter changes into page views. The reader changes the
 * address in place (history.replaceState) and announces it with a `md2book:pageview` event
 * `{ path, title }`; it knows nothing of the provider. If the provider's script is blocked, the
 * glue does nothing and reading is unaffected. Nothing is added without `web_analytics`.
 */
export function analyticsHead(analytics: WebAnalytics | undefined): string {
  if (!analytics) return "";
  const id = esc(analytics.id);
  const onPageview = (body: string) =>
    `<script>document.addEventListener("md2book:pageview", (event) => { const detail = event.detail; ${body} });</script>`;
  switch (analytics.provider) {
    case "google":
      return (
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>` +
        "<script>window.dataLayer = window.dataLayer || []; " +
        "function gtag() { dataLayer.push(arguments); } " +
        `gtag("js", new Date()); gtag("config", "${id}");</script>` +
        onPageview(
          'gtag("event", "page_view", { page_location: location.origin + detail.path, page_title: detail.title });',
        )
      );
    case "plausible":
      // The manual script: Plausible does not see history.replaceState, so md2book counts the
      // first page and each chapter change itself.
      return (
        `<script defer data-domain="${id}" src="https://plausible.io/js/script.manual.js"></script>` +
        "<script>window.plausible = window.plausible || function () { " +
        '(window.plausible.q = window.plausible.q || []).push(arguments); }; plausible("pageview");</script>' +
        onPageview('plausible("pageview", { u: location.origin + detail.path });')
      );
    case "goatcounter":
      // GoatCounter counts the page it loads on; chapter changes are counted once it is there.
      return (
        `<script data-goatcounter="https://${id}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` +
        onPageview("window.goatcounter?.count?.({ path: detail.path, title: detail.title });")
      );
    case "cloudflare":
      // Cloudflare's single-page mode follows history changes itself; it has no counting API.
      return (
        '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ' +
        `data-cf-beacon='{"token":"${id}","spa":true}'></script>`
      );
  }
}
