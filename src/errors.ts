/** A user-facing failure: one line naming the file, key, glob or command and the reason. */
export class BookError extends Error {
  readonly subject: string;
  readonly reason: string;

  constructor(subject: string, reason: string) {
    super(`book-build: ${subject}: ${reason}`);
    this.name = "BookError";
    this.subject = subject;
    this.reason = reason;
  }
}

export function warn(message: string): void {
  process.stderr.write(`warning: ${message}\n`);
}
