export interface ProbeResult {
  readonly latencyMs: number;
  readonly status: "up" | "down";
}

export async function runProbe(
  probe: () => Promise<unknown>,
  timeoutMs: number,
): Promise<ProbeResult> {
  const startedAt = performance.now();

  try {
    await withTimeout(probe(), timeoutMs);
    return { latencyMs: elapsed(startedAt), status: "up" };
  } catch {
    return { latencyMs: elapsed(startedAt), status: "down" };
  }
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("Dependency probe timed out")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
