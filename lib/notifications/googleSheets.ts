import crypto from 'node:crypto'

type LeadRecord = Record<string, unknown>

type GoogleServiceAccount = {
  client_email?: string
  private_key?: string
  token_uri?: string
}

let cachedToken: { value: string; expiresAt: number } | null = null

function getConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim()
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (!spreadsheetId || !serviceAccountJson) return null

  let credentials: GoogleServiceAccount
  try {
    credentials = JSON.parse(serviceAccountJson) as GoogleServiceAccount
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.')
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.')
  }

  return {
    spreadsheetId,
    credentials,
    leadSheet: process.env.GOOGLE_SHEET_NAME?.trim() || 'Leads',
    siteVisitSheet: process.env.GOOGLE_SITE_VISIT_SHEET_NAME?.trim() || 'Site Visits',
  }
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

async function getAccessToken(credentials: GoogleServiceAccount) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(credentials.private_key as string, 'base64url')
  const assertion = `${unsigned}.${signature}`

  const response = await fetch(credentials.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Google OAuth token request failed (${response.status}): ${details.slice(0, 500)}`)
  }

  const data = await response.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('Google OAuth token response did not contain an access token.')
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3600)) * 1000,
  }
  return data.access_token
}

async function sheetsRequest<T>(config: ReturnType<typeof getConfig> extends infer R ? Exclude<R, null> : never, path: string, init: RequestInit = {}) {
  const token = await getAccessToken(config.credentials)
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    const details = await response.text()
    const cleanDetails = details.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim()
    throw new Error(`Google Sheets request failed (${response.status}): ${cleanDetails.slice(0, 1000)}`)
  }
  return response.json() as Promise<T>
}

const SITE_VISIT_COLUMNS = ['Updated At', 'Lead ID', 'Name', 'Phone', 'Preferred Date', 'Preferred Time', 'Location', 'District', 'Locality', 'Area', 'Latitude', 'Longitude', 'Status']

const LEAD_COLUMNS = [
  'Updated At', 'Created At', 'Lead ID', 'Name', 'Phone', 'District', 'Area', 'Bill (₹)',
  'Monthly KWH', 'Category', 'Recommended KW', 'Setup Cost', 'Subsidy',
  'Financing Amount', 'Customer Contribution', 'KSEB Consumer Number',
  'KSEB District', 'KSEB Section', 'Transformer', 'Feasibility Status',
  'Requested KW', 'Remaining Transformer Capacity', 'KSEB Allowed Capacity KW', 'KSEB Feasibility Issued KW', 'KSEB Grid Connected KW', 'KSEB Checked At',
  'Lead Status', 'Privacy Consent', 'Privacy Consent At', 'Terms Version', 'Calculated At', 'Feasibility Checked At', 'Documents Completed At', 'Site Visit Booked At', 'Converted At',
]

function leadRow(lead: LeadRecord) {
  return [
    new Date(String(lead.updated_at || lead.created_at || new Date().toISOString())).toISOString(),
    lead.created_at ? new Date(String(lead.created_at)).toISOString() : '',
    lead.lead_id ?? '',
    lead.name ?? '',
    lead.phone ?? '',
    lead.district ?? '',
    lead.area ?? '',
    lead.bill ?? '',
    lead.monthly_kwh ?? '',
    lead.connection_category ?? '',
    lead.recommended_kw ?? '',
    lead.setup_cost ?? '',
    lead.subsidy ?? '',
    lead.financing_amount ?? '',
    lead.customer_contribution ?? '',
    lead.kseb_consumer_number ?? '',
    lead.kseb_district ?? '',
    lead.kseb_section ?? '',
    lead.transformer ?? '',
    lead.feasibility_status ?? '',
    lead.requested_kw ?? '',
    lead.remaining_transformer_capacity ?? '',
    lead.kseb_allowed_capacity_kw ?? '',
    lead.kseb_feasibility_issued_kw ?? '',
    lead.kseb_grid_connected_kw ?? '',
    lead.kseb_checked_at ?? '',
    lead.lead_status ?? '',
    lead.privacy_consent ?? '',
    lead.privacy_consent_at ?? '',
    lead.terms_version ?? '',
    lead.calculated_at ?? '',
    lead.feasibility_checked_at ?? '',
    lead.documents_completed_at ?? '',
    lead.site_visit_booked_at ?? '',
    lead.converted_at ?? '',
  ]
}

async function ensureLeadHeader(config: NonNullable<ReturnType<typeof getConfig>>) {
  const range = `${encodeURIComponent(config.leadSheet)}!A1:AH1`
  const data = await sheetsRequest<{ values?: string[][] }>(config, `/values/${range}`)
  if ((data.values?.[0]?.length ?? 0) >= LEAD_COLUMNS.length) return
  await sheetsRequest(config, `/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ range: `${config.leadSheet}!A1:AH1`, majorDimension: 'ROWS', values: [LEAD_COLUMNS] }),
  })
}

async function findLeadRow(config: NonNullable<ReturnType<typeof getConfig>>, leadId: string) {
  const range = `${encodeURIComponent(config.leadSheet)}!B:B`
  const data = await sheetsRequest<{ values?: string[][] }>(config, `/values/${range}`)
  const index = (data.values || []).findIndex((row) => String(row[0] ?? '').trim() === leadId)
  return index >= 1 ? index + 1 : null
}

export async function syncLeadToGoogleSheet(lead: LeadRecord) {
  const config = getConfig()
  if (!config) return { configured: false, saved: false }

  await ensureLeadHeader(config)
  const leadId = String(lead.lead_id ?? '').trim()
  if (!leadId) throw new Error('Cannot sync a lead without a Lead ID.')

  const row = leadRow(lead)
  const existingRow = await findLeadRow(config, leadId)
  if (existingRow) {
    await sheetsRequest(config, `/values/${encodeURIComponent(config.leadSheet)}!A${existingRow}:AH${existingRow}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ range: `${config.leadSheet}!A${existingRow}:Z${existingRow}`, majorDimension: 'ROWS', values: [row] }),
    })
  } else {
    await sheetsRequest(config, `/values/${encodeURIComponent(config.leadSheet)}!A:AH:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
    })
  }
  return { configured: true, saved: true }
}

export async function appendSiteVisitToGoogleSheet(siteVisit: LeadRecord) {
  const config = getConfig()
  if (!config) return { configured: false, saved: false }

  const headerRange = `${encodeURIComponent(config.siteVisitSheet)}!A1:M1`
  const header = await sheetsRequest<{ values?: string[][] }>(config, `/values/${headerRange}`)
  if ((header.values?.[0]?.length ?? 0) < SITE_VISIT_COLUMNS.length) {
    await sheetsRequest(config, `/values/${headerRange}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ range: `${config.siteVisitSheet}!A1:M1`, majorDimension: 'ROWS', values: [SITE_VISIT_COLUMNS] }),
    })
  }

  const row = [
    new Date(String(siteVisit.updated_at || siteVisit.created_at || new Date().toISOString())).toISOString(),
    siteVisit.lead_id ?? '',
    siteVisit.name ?? '',
    siteVisit.phone ?? '',
    siteVisit.preferred_date ?? '',
    siteVisit.preferred_time ?? '',
    siteVisit.location ?? '',
    siteVisit.district ?? '',
    siteVisit.locality ?? '',
    siteVisit.area ?? '',
    siteVisit.latitude ?? '',
    siteVisit.longitude ?? '',
    siteVisit.status ?? 'BOOKED',
  ]

  await sheetsRequest(config, `/values/${encodeURIComponent(config.siteVisitSheet)}!A:M:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
  })
  return { configured: true, saved: true }
}
