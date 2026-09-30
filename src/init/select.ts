import { emitKeypressEvents } from "node:readline";
import { BookError } from "../errors.ts";

export interface Choice<T> {
  label: string;
  value: T;
}

interface Key {
  str?: string;
  name?: string;
  ctrl?: boolean;
}

type Input = NodeJS.ReadableStream & { isTTY?: boolean; setRawMode?: (raw: boolean) => void };

/**
 * The init wizard's prompts (spec 006, research R-04): a list chosen with ↑/↓ and Enter (or a
 * digit), and a line of text. Every key goes through one queue, so keys typed ahead are kept for
 * the next prompt instead of being lost between prompts.
 */
export function openTerminal(io: { input: Input; output: NodeJS.WritableStream }) {
  const { input, output } = io;
  const queue: Key[] = [];
  let waiting: ((key: Key) => void) | undefined;
  const onKey = (str: string | undefined, key: Key | undefined) => {
    const next = { str, name: key?.name, ctrl: key?.ctrl };
    if (waiting) {
      const resolve = waiting;
      waiting = undefined;
      resolve(next);
    } else {
      queue.push(next);
    }
  };
  emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.on("keypress", onKey);
  input.resume();

  const nextKey = async (): Promise<Key> => {
    const key = queue.shift() ?? (await new Promise<Key>((resolve) => (waiting = resolve)));
    if (key.ctrl && key.name === "c") throw new BookError("init", "cancelled");
    return key;
  };
  const isEnter = (key: Key) => key.name === "return" || key.name === "enter";

  return {
    async select<T>(question: string, choices: Choice<T>[]): Promise<T> {
      let index = 0;
      const draw = (again: boolean) => {
        if (again) output.write(`\u001b[${choices.length}A`);
        for (const [i, choice] of choices.entries()) {
          output.write(`\r\u001b[2K${i === index ? "❯" : " "} ${choice.label}\n`);
        }
      };
      output.write(`? ${question}\n`);
      draw(false);
      for (;;) {
        const key = await nextKey();
        const digit = Number(key.str);
        if (Number.isInteger(digit) && digit >= 1 && digit <= choices.length) {
          index = digit - 1;
        } else if (key.name === "up" || key.name === "down") {
          index = Math.min(choices.length - 1, Math.max(0, index + (key.name === "up" ? -1 : 1)));
          draw(true);
          continue;
        } else if (!isEnter(key)) {
          continue;
        }
        draw(true);
        return choices[index]!.value;
      }
    },

    async text(question: string): Promise<string> {
      output.write(`? ${question}: `);
      let value = "";
      for (;;) {
        const key = await nextKey();
        if (isEnter(key)) {
          output.write("\n");
          return value.trim();
        }
        if (key.name === "backspace") {
          if (value) {
            value = [...value].slice(0, -1).join("");
            output.write("\b \b");
          }
        } else if (key.str && !key.ctrl && key.str >= " ") {
          value += key.str;
          output.write(key.str);
        }
      }
    },

    close() {
      input.off("keypress", onKey);
      input.setRawMode?.(false);
      input.pause();
    },
  };
}
