import { analyzeApi } from '../api';

const DEFAULT_MAX_POLLS = 150; // ~5 min at 2s interval
const DEFAULT_INTERVAL_MS = 2000;
// A few consecutive status-poll errors are tolerated (backend restart, proxy
// blip, transient 5xx) before giving up — the analysis task may still finish.
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Poll /api/analyze/status until completed, failed, or timeout.
 *
 * Pass an AbortSignal (via `signal`) to cancel polling when the caller
 * unmounts — this stops the interval and prevents runaway background
 * requests and setState-after-unmount. Aborted polls reject with an
 * AbortError, which callers should ignore.
 *
 * @returns {Promise<object>} graph result payload
 */
export async function pollAnalyzeTask(taskId, {
  intervalMs = DEFAULT_INTERVAL_MS,
  maxPolls = DEFAULT_MAX_POLLS,
  onPoll,
  signal,
} = {}) {
  let polls = 0;
  let consecutiveErrors = 0;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Analysis polling aborted', 'AbortError'));
      return;
    }

    let timer = null;

    const cleanup = () => {
      if (timer) clearInterval(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Analysis polling aborted', 'AbortError'));
    };

    const tick = async () => {
      if (signal?.aborted) {
        onAbort();
        return;
      }

      polls += 1;
      if (onPoll) onPoll(polls);

      if (polls > maxPolls) {
        cleanup();
        reject(new Error('Analysis timed out. The backend may still be running — try again in a minute.'));
        return;
      }

      try {
        const res = await analyzeApi.status(taskId);
        if (signal?.aborted) {
          onAbort();
          return;
        }
        consecutiveErrors = 0;
        const { status, result, error } = res.data || {};

        if (status === 'completed') {
          cleanup();
          resolve(result || {});
        } else if (status === 'failed') {
          cleanup();
          reject(new Error(error || 'Analysis failed'));
        }
      } catch (err) {
        if (signal?.aborted) {
          onAbort();
          return;
        }
        // Tolerate transient errors — the backend task may still be running.
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          cleanup();
          reject(err);
        }
      }
    };

    timer = setInterval(tick, intervalMs);
    if (signal) signal.addEventListener('abort', onAbort);
    // Poll immediately so fast tasks don't wait a full interval.
    tick();
  });
}
