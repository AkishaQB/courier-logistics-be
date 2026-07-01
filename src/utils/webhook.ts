import { createHmac } from "crypto";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import "dotenv/config";

// ─── Payload shape sent on every package status change ────────────────────────

export interface PackageStatusWebhookPayload {
  event: "package.status_updated";
  trackingId: string;
  status: string;
  regionCode?: string;   // currentRegion at the time of the update
  notes?: string;        // optional message / delay reason
  timestamp: string;     // ISO-8601, set at fire time
}

// ─── Config ───────────────────────────────────────────────────────────────────

const WEBHOOK_URL = process.env.TRACK_BE_WEBHOOK_URL ?? "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

// ─── HMAC signature ───────────────────────────────────────────────────────────

/**
 * Computes `sha256=<hex>` over the raw JSON body using the shared secret.
 * The Track BE receiver will recompute this and compare with timing-safe equality.
 */
function signPayload(body: string): string {
  const hmac = createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

// ─── HTTP POST (no external deps — uses Node built-ins) ───────────────────────

function postJson(url: string, body: string, signature: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const requestFn = isHttps ? httpsRequest : httpRequest;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "X-Webhook-Signature": signature,
        // Allow the receiver to quickly identify the sender
        "X-Webhook-Source": "courier-logistics-be",
      },
    };

    const req = requestFn(options, (res) => {
      // Drain the response so the socket closes cleanly
      res.resume();
      resolve(res.statusCode ?? 0);
    });

    req.on("error", reject);

    // Set a short timeout — we don't want to block if the receiver is down
    req.setTimeout(5_000, () => {
      req.destroy(new Error("Webhook request timed out"));
    });

    req.write(body);
    req.end();
  });
}

// ─── Retry helpers ────────────────────────────────────────────────────────────

/** Delays for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry configuration.
 *
 * BACKOFF_DELAYS defines the wait time (ms) *before* each retry attempt:
 *   attempt 1 (initial)  — no delay
 *   attempt 2 (retry 1)  — wait 1 s
 *   attempt 3 (retry 2)  — wait 2 s
 *   attempt 4 (retry 3)  — wait 4 s
 */
const MAX_ATTEMPTS = 4;                           // 1 initial + 3 retries
const BACKOFF_DELAYS = [1_000, 2_000, 4_000];     // ms between attempts

/**
 * Attempts to POST the signed webhook payload, retrying on transient failures.
 *
 * **Retry policy:**
 * - Network error / timeout → retry (transient, may self-heal)
 * - HTTP 5xx              → retry (server error, may self-heal)
 * - HTTP 4xx              → **no retry** (bad signature / bad payload —
 *                           retrying cannot fix a permanent client error)
 * - HTTP 2xx              → success, stop immediately
 *
 * Logs the outcome of every attempt so failures are visible in server logs.
 */
async function deliverWithRetry(
  url: string,
  body: string,
  signature: string,
  trackingId: string,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isLastAttempt = attempt === MAX_ATTEMPTS;

    try {
      const statusCode = await postJson(url, body, signature);

      if (statusCode >= 200 && statusCode < 300) {
        const retryNote = attempt > 1 ? ` (attempt ${attempt})` : "";
        console.log(`[webhook] ✅ Delivered${retryNote} (${statusCode}) — trackingId: ${trackingId}`);
        return; // success — stop here
      }

      if (statusCode >= 400 && statusCode < 500) {
        // 4xx = permanent failure; retrying won't help
        console.error(
          `[webhook] ❌ Permanent failure (${statusCode}) — trackingId: ${trackingId}` +
          ` — not retrying (check signature / payload)`,
        );
        return;
      }

      // 5xx or unexpected code — log and fall through to retry logic
      console.warn(
        `[webhook] ⚠️  Attempt ${attempt}/${MAX_ATTEMPTS} — ` +
        `server error (${statusCode}) — trackingId: ${trackingId}`,
      );
    } catch (err: unknown) {
      // Network error, timeout, DNS failure, etc.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[webhook] ⚠️  Attempt ${attempt}/${MAX_ATTEMPTS} — ` +
        `network error: ${message} — trackingId: ${trackingId}`,
      );
    }

    if (isLastAttempt) {
      console.error(
        `[webhook] ❌ All ${MAX_ATTEMPTS} attempts failed — ` +
        `giving up — trackingId: ${trackingId}`,
      );
      return;
    }

    // Exponential backoff before the next attempt
    const delay = BACKOFF_DELAYS[attempt - 1];
    console.log(`[webhook] ↩  Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS}) — trackingId: ${trackingId}`);
    await sleep(delay);
  }
}

/**
 * Fires a signed `package.status_updated` webhook to the Track BE.
 *
 * **Fire-and-forget** — the promise is never awaited by callers so it never
 * blocks the logistics API response. Delivery is attempted up to 4 times
 * (1 initial + 3 retries at 1 s / 2 s / 4 s exponential backoff).
 *
 * @example
 *   firePackageStatusWebhook({
 *     trackingId: pkg.trackingId,
 *     status: payload.status,
 *     regionCode: updatedPkg.currentRegion.regionCode,
 *     notes: payload.notes,
 *   });
 */
export function firePackageStatusWebhook(
  data: Omit<PackageStatusWebhookPayload, "event" | "timestamp">,
): void {
  if (!WEBHOOK_URL) {
    console.warn("[webhook] TRACK_BE_WEBHOOK_URL is not set — skipping delivery");
    return;
  }

  if (!WEBHOOK_SECRET) {
    console.warn("[webhook] WEBHOOK_SECRET is not set — skipping delivery (would be insecure)");
    return;
  }

  const payload: PackageStatusWebhookPayload = {
    event: "package.status_updated",
    timestamp: new Date().toISOString(),
    ...data,
  };

  const body = JSON.stringify(payload);
  const signature = signPayload(body);

  // Intentionally not awaited — fire-and-forget with retry
  void deliverWithRetry(WEBHOOK_URL, body, signature, data.trackingId);
}
