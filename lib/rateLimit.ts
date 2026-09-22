import { ensureLeadTable, getSql } from '@/lib/db'

function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const real = request.headers.get('x-real-ip')?.trim()
  return `${scope}:${forwarded || real || 'unknown'}`
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  await ensureLeadTable()
  const key = clientKey(request, scope)
  const rows = await getSql()`
    INSERT INTO api_rate_limits (rate_key, window_start, request_count)
    VALUES (
      ${key},
      to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}),
      1
    )
    ON CONFLICT (rate_key, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1
    RETURNING request_count
  `
  const typedRows = rows as unknown as Record<string, any>[]
  const count = Number(typedRows[0]?.request_count ?? 1)
  return {
    limited: count > limit,
    count,
    retryAfter: Math.max(1, windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds)),
  }
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { success: false, message: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
