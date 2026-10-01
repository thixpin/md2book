import type { z } from "zod";
import type { SeriesStrings } from "../config/language.ts";
import type { webAnalyticsSchema } from "../config/schema.ts";
import { escapeHtml as esc } from "../manuscript/text.ts";

export type WebAnalytics = z.infer<typeof webAnalyticsSchema>;

/** A value for an inline script: JSON, with `<` escaped so no text can close the script. */
const scriptValue = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Google Analytics behind a consent banner (`consent: true`). Nothing of Google's loads until the
 * reader agrees; the choice is kept in the browser (`md2book:analytics-consent`) so the banner
 * shows once, and a "Cookie settings" button in the footer reopens it. Declining after agreeing
 * switches Google Analytics off (`ga-disable-<id>`) and removes its `_ga` cookies. The banner
 * sits above the reader's page controls, so reading goes on while it shows.
 */
function consentScript(id: string, text: SeriesStrings["consent"]): string {
  return `<script>(() => {
const ID = ${scriptValue(id)};
const TEXT = ${scriptValue(text)};
const KEY = "md2book:analytics-consent";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (value) => { try { localStorage.setItem(KEY, value); } catch {} };
let loaded = false;
const load = () => {
  window["ga-disable-" + ID] = false;
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", ID);
  const tag = document.createElement("script");
  tag.async = true;
  tag.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.append(tag);
};
const forget = () => {
  window["ga-disable-" + ID] = true;
  const host = location.hostname.split(".");
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    document.cookie = name + "=; Max-Age=0; path=/";
    for (let i = 0; i < host.length; i++) {
      document.cookie = name + "=; Max-Age=0; path=/; domain=" + host.slice(i).join(".");
    }
  }
};
document.addEventListener("md2book:pageview", (event) => {
  if (!loaded || window["ga-disable-" + ID]) return;
  const detail = event.detail;
  gtag("event", "page_view", { page_location: location.origin + detail.path, page_title: detail.title });
});
let banner = null;
const place = () => {
  const controls = document.querySelector(".reader-controls");
  const top = controls ? controls.getBoundingClientRect().top : innerHeight;
  banner.style.bottom = Math.max(12, innerHeight - top + 8) + "px";
};
const choose = (value) => {
  write(value);
  banner.hidden = true;
  if (value === "granted") load();
  else forget();
};
const show = () => {
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "md2book-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", TEXT.settings);
    const message = document.createElement("p");
    message.textContent = TEXT.message;
    const actions = document.createElement("div");
    for (const [value, label] of [["denied", TEXT.decline], ["granted", TEXT.agree]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.consent = value;
      button.textContent = label;
      button.addEventListener("click", () => choose(value));
      actions.append(button);
    }
    banner.append(message, actions);
    document.body.append(banner);
    addEventListener("resize", () => banner.hidden || place());
  }
  banner.hidden = false;
  place();
};
if (read() === "granted") load();
const start = () => {
  const footer = document.querySelector(".footer");
  if (footer) {
    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "md2book-consent-settings";
    settings.textContent = TEXT.settings;
    settings.addEventListener("click", show);
    footer.append(" ", settings);
  }
  if (!read()) show();
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
})();</script>`;
}

/**
 * Opt-in analytics for the web edition (`web_analytics`): the provider's own tag, and a small
 * glue script that turns the reader's chapter changes into page views. The reader changes the
 * address in place (history.replaceState) and announces it with a `md2book:pageview` event
 * `{ path, title }`; it knows nothing of the provider. If the provider's script is blocked, the
 * glue does nothing and reading is unaffected. Nothing is added without `web_analytics`.
 */
export function analyticsHead(
  analytics: WebAnalytics | undefined,
  strings: Pick<SeriesStrings, "consent">,
): string {
  if (!analytics) return "";
  if (analytics.provider === "google" && analytics.consent) {
    return consentScript(analytics.id, strings.consent);
  }
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
