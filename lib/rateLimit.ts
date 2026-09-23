import { ensureLeadTable, getSql } from '@/lib/db'

function clientKey(request: Request, scope: string) {
  // Vercel sanitizes X-Forwarded-For to prevent client IP spoofing. Prefer
  // the Vercel-specific copy because it remains available when another proxy
  // sits in front of the deployment.
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')?.trim()
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = vercelForwarded || forwarded || 'unknown'
  return `${scope}:${ip}`
}

export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  await ensureLeadTable()
  const key = clientKey(request, scope)
  const sql = getSql()

  await sql`
    DELETE FROM api_rate_limits
    WHERE window_start < now() - make_interval(secs => ${windowSeconds * 2})
  `

  const rows = await sql`
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
