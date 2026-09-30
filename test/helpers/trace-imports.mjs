// Node --import hook for tests: records every module specifier the process resolves, and prints
// them (one per line) to stderr on exit, prefixed with "import:".
import { register } from "node:module";
import process from "node:process";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();
const seen = new Set();
port1.on("message", (specifier) => seen.add(specifier));
port1.unref();
register(
  `data:text/javascript,${encodeURIComponent(`
    let port;
    export function initialize(data) { port = data.port; }
    export async function resolve(specifier, context, next) {
      port.postMessage(specifier);
      return next(specifier, context);
    }
  `)}`,
  { data: { port: port2 }, transferList: [port2] },
);
process.on("exit", () => {
  for (const specifier of seen) process.stderr.write(`import:${specifier}\n`);
});
