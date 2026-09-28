// Constitution VI: tests never reach the network. Only local servers are allowed.
const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const realFetch = globalThis.fetch;

globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`network access in tests: ${url.hostname}`);
  }
  return realFetch(input, init);
};
