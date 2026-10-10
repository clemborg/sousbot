/** Session debug logging (local ingest + Vercel console). */
export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  const payload = {
    sessionId: '39e8d4',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId: process.env.SOUSBOT_DEBUG_RUN ?? 'pre-fix',
  };
  // #region agent log
  console.log('[sousbot-debug]', JSON.stringify(payload));
  fetch('http://127.0.0.1:7854/ingest/fe964a1e-6cbc-4a15-a883-65e8fded7b9d', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '39e8d4' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
