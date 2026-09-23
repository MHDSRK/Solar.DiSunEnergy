'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { calculateSolarResult } from '@/services/solar/calculator'

// Saved design assets for the next page iteration.
export const floorImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-C3090BE5-0zzyFAsUgRwLxLDeh1A2N1YUSLqpBi.jpeg'
export const markImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-B6267883-BYNKz4nIws4F3XvdcZk2uddggsWgeT.jpeg'

export default function Page() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [leadToken, setLeadToken] = useState<string | null>(null)
  const [leadSaveError, setLeadSaveError] = useState('')
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  const [isFeasibilityPage, setIsFeasibilityPage] = useState(false)
  const [isEligibilityPage, setIsEligibilityPage] = useState(false)
  const [eligibilityFiles, setEligibilityFiles] = useState({ aadhaar: null as File | null, pan: null as File | null, bill: null as File | null, passbook: null as File | null })
  const [eligibilityErrors, setEligibilityErrors] = useState<Record<string, string>>({})
  const [eligibilitySubmitted, setEligibilitySubmitted] = useState(false)
  const [eligibilitySubmitting, setEligibilitySubmitting] = useState(false)
  const [eligibilitySubmitError, setEligibilitySubmitError] = useState('')
  const [siteVisit, setSiteVisit] = useState({ name: '', phone: '', date: '', time: '', location: '' })
  const [siteVisitErrors, setSiteVisitErrors] = useState<Record<string, string>>({})
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [siteVisitMessage, setSiteVisitMessage] = useState('')
  const [siteVisitSubmitting, setSiteVisitSubmitting] = useState(false)
  const [feasibilityForm, setFeasibilityForm] = useState({ consumerNumber: '', districtId: '', districtName: '', sectionId: '', sectionOffice: '', transformerId: '', transformerName: '' })
  const [ksebDistricts, setKsebDistricts] = useState<Array<{ id: string; name: string }>>([])
  const [ksebSections, setKsebSections] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const [isLoadingSections, setIsLoadingSections] = useState(false)
  const [isLoadingTransformers, setIsLoadingTransformers] = useState(false)
  const [ksebTransformers, setKsebTransformers] = useState<Array<{ id: string; transformerName: string; feederName: string; dtrCapacityKva: number; allowedCapacityKw: number; feasibilityIssuedKw: number; gridConnectedKw: number; balanceAvailableKw: number }>>([])
  const [feasibilityErrors, setFeasibilityErrors] = useState<Record<string, string>>({})
  const [ksebLoadError, setKsebLoadError] = useState('')
  const [feasibilityResult, setFeasibilityResult] = useState<Record<string, unknown> | null>(null)
  const [isCheckingFeasibility, setIsCheckingFeasibility] = useState(false)
  const [calculationMode, setCalculationMode] = useState<'bill' | 'units'>('bill')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [form, setForm] = useState({ bill: '', category: '', fullName: '', phone: '', district: '', area: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCalculating, setIsCalculating] = useState(false)
  const sheetRef = useRef<HTMLElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<{ kw: number; roofMin: number; roofMax: number; cost: number; subsidy: number; loan: number; netCost: number; monthlyKwh: number } | null>(null)
  useEffect(() => {
    if (!result) return
    requestAnimationFrame(() => {
      const sheet = sheetRef.current
      const result = resultRef.current
      if (!sheet || !result) return
      sheet.scrollTo({ top: Math.max(0, result.offsetTop - 56), behavior: 'smooth' })
    })
  }, [result])

  useEffect(() => {
    if (!eligibilitySubmitted) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sheet = sheetRef.current
        if (!sheet) return
        sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' })
      })
    })
  }, [eligibilitySubmitted])

  useEffect(() => {
    if (!isEligibilityPage || siteVisit.location) return
    setLocationLoading(true)
    setLocationMessage('')
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setSiteVisit((current) => ({ ...current, location: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}` }))
        setLocationLoading(false)
      },
      () => {
        setLocationLoading(false)
        setLocationMessage('Location access is not available. You can enable it below or enter the location manually.')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }, [isEligibilityPage])

  useEffect(() => {
    if (!feasibilityResult) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sheet = sheetRef.current
        if (!sheet) return
        sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' })
      })
    })
  }, [feasibilityResult])
  const keralaDistricts = ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad']

  const validateField = (field: keyof typeof form, value: string) => {
    const message = field === 'bill' && (!value || !/^\d+$/.test(value) || Number(value) <= 0) ? 'Enter a valid amount' : field === 'category' && !value ? 'Select a category' : field === 'fullName' && !value.trim() ? 'Enter your full name' : field === 'phone' && !/^[6-9]\d{9}$/.test(value) ? 'Enter a valid 10-digit phone number' : field === 'district' && !value ? 'Select your district' : field === 'area' && !value.trim() ? 'Enter your area' : ''
    setErrors((current) => ({ ...current, [field]: message }))
  }

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const calculateResult = () => calculateSolarResult(Number(form.bill), form.category, calculationMode)
  const createLead = async () => {
    if (isCreatingLead) return false
    setIsCreatingLead(true)
    setLeadSaveError('')
    try {
      const response = await fetch('/api/leads', { method: 'POST', cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.leadId || !data.leadToken) {
        throw new Error(data.message || 'Unable to start the calculator (HTTP ' + response.status + ').')
      }
      setLeadId(data.leadId)
      setLeadToken(data.leadToken)
      return true
    } catch (error) {
      console.error('Lead creation failed', error)
      setLeadId(null)
      setLeadToken(null)
      setLeadSaveError(error instanceof Error ? error.message : 'Unable to start the calculator. Please try again.')
      return false
    } finally {
      setIsCreatingLead(false)
    }
  }

  const updateLead = async (updates: Record<string, unknown>) => {
    if (!leadId || !leadToken) return false
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch('/api/leads', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ leadId, leadToken, ...updates }),
        })
        if (response.ok) {
          setLeadSaveError('')
          return true
        }
        const data = await response.json().catch(() => ({}))
        if (response.status === 401 || response.status === 404) {
          setLeadSaveError(data.message || 'Lead authorization expired. Please start a new calculation.')
          return false
        }
      } catch (error) {
        if (attempt === 2) console.error('Lead update failed', error)
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350))
    }
    setLeadSaveError('We could not save your latest details. Please try again.')
    return false
  }

  const validateAndSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.bill || !/^\d+$/.test(form.bill) || Number(form.bill) <= 0) nextErrors.bill = 'Enter a valid amount'
    if (!form.category) nextErrors.category = 'Select a category'
    if (!form.fullName.trim()) nextErrors.fullName = 'Enter your full name'
    if (!/^[6-9]\d{9}$/.test(form.phone)) nextErrors.phone = 'Enter a valid 10-digit phone number'
    if (!form.district.trim()) nextErrors.district = 'Enter your district'
    if (!form.area.trim()) nextErrors.area = 'Enter your area'
    if (!privacyConsent) nextErrors.consent = 'Please agree to the Privacy Policy and Terms & Conditions.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      if (isCreatingLead) {
        setLeadSaveError('Please wait while we start your calculator.')
        return
      }
      if (!leadId || !leadToken) {
        setLeadSaveError('Your lead session could not be created. Please close this window and tap CALCULATE NOW again.')
        return
      }
      setResult(null)
      setIsCalculating(true)
      requestAnimationFrame(() => sheetRef.current?.scrollTo({ top: sheetRef.current.scrollHeight, behavior: 'smooth' }))
      window.setTimeout(() => {
        const calculated = calculateResult()
        setResult(calculated)
        setIsCalculating(false)
        void (async () => {
          const saved = await updateLead({
            name: form.fullName,
            phone: form.phone,
            district: form.district,
            area: form.area,
            bill: calculationMode === 'bill' ? Number(form.bill) : null,
            monthly_kwh: calculated.monthlyKwh,
            connection_category: form.category,
            recommended_kw: calculated.kw,
            setup_cost: calculated.cost,
            subsidy: calculated.subsidy,
            financing_amount: calculated.loan,
            customer_contribution: calculated.netCost,
            privacy_consent: privacyConsent,
          })
          if (!saved) console.error('Calculator lead update did not complete.')
        })()
requestAnimationFrame(() => {
          const sheet = sheetRef.current
          const result = resultRef.current
          if (!sheet || !result) return
          sheet.scrollTo({ top: Math.max(0, result.offsetTop - 56), behavior: 'smooth' })
        })
      }, 3000)
    }
  }

  const loadKsebDistricts = async () => {
    if (ksebDistricts.length) return
    setIsLoadingDistricts(true)
    setKsebLoadError('')
    try {
      const response = await fetch('/api/kseb/districts')
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load KSEB districts.')
      setKsebDistricts(data.districts ?? [])
    } catch {
      setKsebDistricts([])
      setKsebLoadError('Unable to load KSEB district data. Please try again.')
    } finally {
      setIsLoadingDistricts(false)
    }
  }

  const selectKsebDistrict = async (districtId: string) => {
    const district = ksebDistricts.find((item) => item.id === districtId)
    setFeasibilityForm((current) => ({ ...current, districtId, districtName: district?.name ?? '', sectionId: '', sectionOffice: '', transformerId: '', transformerName: '' }))
    setKsebSections([])
    setKsebTransformers([])
    setFeasibilityResult(null)
    setKsebLoadError('')
    if (!districtId) return

    setIsLoadingSections(true)
    try {
      const response = await fetch(`/api/kseb/sections?districtId=${encodeURIComponent(districtId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load KSEB sections.')
      setKsebSections(data.sections ?? [])
      if (!(data.sections ?? []).length) setKsebLoadError('No KSEB sections were found for the selected district.')
    } catch {
      setKsebSections([])
      setKsebLoadError('Unable to load KSEB sections. Please try again.')
    } finally {
      setIsLoadingSections(false)
    }
  }

  const selectKsebSection = async (sectionId: string) => {
    const section = ksebSections.find((item) => item.id === sectionId)
    setFeasibilityForm((current) => ({ ...current, sectionId, sectionOffice: section?.name ?? '', transformerId: '', transformerName: '' }))
    setFeasibilityResult(null)
    setKsebTransformers([])
    setKsebLoadError('')
    if (!sectionId) return

    setIsLoadingTransformers(true)
    try {
      const response = await fetch(`/api/kseb/transformers?sectionId=${encodeURIComponent(sectionId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load KSEB transformers.')
      setKsebTransformers(data.transformers ?? [])
      if (!(data.transformers ?? []).length) setKsebLoadError('No KSEB transformers were found for the selected section.')
    } catch {
      setKsebTransformers([])
      setKsebLoadError('Unable to load KSEB transformer data. Please try again.')
    } finally {
      setIsLoadingTransformers(false)
    }
  }

  const submitFeasibility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const normalizedConsumerNumber = feasibilityForm.consumerNumber.replace(/[\s-]/g, '')
    const hasSection = feasibilityForm.sectionId.trim().length > 0

    if (!normalizedConsumerNumber) nextErrors.consumerNumber = 'Consumer number is required.'
    else if (!/^\d{13}$/.test(normalizedConsumerNumber)) nextErrors.consumerNumber = 'Please enter a valid 13-digit KSEB Consumer Number.'
    if (!hasSection) nextErrors.lookup = 'Select a KSEB District and Section.'
    if (!result?.kw) nextErrors.lookup = 'Complete the solar calculation before checking feasibility.'
    if (!feasibilityForm.transformerId) nextErrors.transformer = 'Select a transformer from the KSEB list.'

    setFeasibilityErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setIsCheckingFeasibility(true)
    setFeasibilityResult(null)
    try {
      const response = await fetch('/api/kseb/transformer-feasibility', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consumerNumber: normalizedConsumerNumber, districtId: feasibilityForm.districtId, district: feasibilityForm.districtName, sectionId: feasibilityForm.sectionId, sectionOffice: feasibilityForm.sectionOffice, transformerId: feasibilityForm.transformerId, transformerName: feasibilityForm.transformerName, requestedKw: result?.kw }) })
      const feasibilityData = await response.json()
      setFeasibilityResult(feasibilityData)
      if (feasibilityData.success) {
        const saved = await updateLead({
          kseb_consumer_number: normalizedConsumerNumber,
          kseb_district: feasibilityForm.districtName,
          kseb_section: feasibilityForm.sectionOffice,
          transformer: feasibilityForm.transformerName,
          feasibility_status: feasibilityData.status,
          requested_kw: feasibilityData.requestedKw,
          remaining_transformer_capacity: feasibilityData.remainingAfterInstallationKw,
          kseb_allowed_capacity_kw: feasibilityData.transformer?.allowedCapacityKw,
          kseb_feasibility_issued_kw: feasibilityData.transformer?.feasibilityIssuedKw,
          kseb_grid_connected_kw: feasibilityData.transformer?.gridConnectedKw,
          kseb_checked_at: feasibilityData.retrievedAt,
        })
        if (!saved) console.error('Feasibility lead update did not complete.')
      }
    } catch { setFeasibilityResult({ success: false, state: 'KSEB_DATA_UNAVAILABLE', message: 'KSEB transformer capacity data is temporarily unavailable.' }) }
    finally { setIsCheckingFeasibility(false) }
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location access is not supported by this browser. Please enter the location manually.')
      return
    }
    setLocationLoading(true)
    setLocationMessage('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSiteVisit((current) => ({ ...current, location: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}` }))
        setLocationLoading(false)
      },
      () => {
        setLocationLoading(false)
        setLocationMessage('Please enable location access in your browser settings, then try again.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const submitEligibility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!eligibilityFiles.aadhaar) nextErrors.aadhaar = 'Upload Aadhaar Card.'
    if (!eligibilityFiles.pan) nextErrors.pan = 'Upload PAN Card.'
    if (!eligibilityFiles.bill) nextErrors.bill = 'Upload Latest KSEB Bill.'
    if (!eligibilityFiles.passbook) nextErrors.passbook = 'Upload Bank Passbook.'
    for (const [key, file] of Object.entries(eligibilityFiles)) {
      if (file && file.size > 4 * 1024 * 1024) nextErrors[key] = 'Maximum file size is 4 MB.'
    }
    setEligibilityErrors(nextErrors)
    setEligibilitySubmitError('')
    if (Object.keys(nextErrors).length) return
    if (!leadId || !leadToken) {
      setEligibilitySubmitError('Your lead session has expired. Please start a new calculation.')
      return
    }

    setEligibilitySubmitting(true)
    try {
      for (const [documentType, file] of Object.entries(eligibilityFiles)) {
        if (!file) continue
        const body = new FormData()
        body.append('leadId', leadId)
        body.append('leadToken', leadToken)
        body.append('documentType', documentType)
        body.append('file', file)
        const response = await fetch('/api/leads/documents', { method: 'POST', body })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || 'Unable to save one of the documents.')
      }
      setEligibilitySubmitted(true)
    } catch (error) {
      setEligibilitySubmitted(false)
      setEligibilitySubmitError(error instanceof Error ? error.message : 'Unable to submit the documents. Please try again.')
    } finally {
      setEligibilitySubmitting(false)
    }
  }

  const submitSiteVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!siteVisit.name.trim()) nextErrors.name = 'Enter your name.'
    if (!/^[6-9]\d{9}$/.test(siteVisit.phone)) nextErrors.phone = 'Enter a valid 10-digit phone number.'
    if (!siteVisit.date) nextErrors.date = 'Select a preferred date.'
    if (!siteVisit.time) nextErrors.time = 'Select a preferred time.'
    if (!siteVisit.location.trim()) nextErrors.location = 'Enter or capture your exact location.'
    setSiteVisitErrors(nextErrors)
    setSiteVisitMessage('')
    if (Object.keys(nextErrors).length || !leadId || !leadToken) {
      if (!leadId || !leadToken) setSiteVisitMessage('Your lead session has expired. Please start a new calculation.')
      return
    }

    setSiteVisitSubmitting(true)
    try {
      const response = await fetch('/api/leads/site-visit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId, leadToken, ...siteVisit }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Unable to book the site visit.')
      setSiteVisitMessage(data.message || 'Site visit request received. Our executive will contact you soon.')
    } catch (error) {
      setSiteVisitMessage(error instanceof Error ? error.message : 'Unable to book the site visit. Please try again.')
    } finally {
      setSiteVisitSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-dvh overflow-y-auto bg-[#03132f] text-white" aria-label="DiSun Energy International solar calculator">
      <div className="fixed inset-0 bg-[#03132f] bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: `url(${floorImage})` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,19,47,.08)_0%,rgba(3,19,47,.08)_48%,rgba(3,19,47,.18)_100%)]" aria-hidden="true" />

      <header className="fixed inset-x-0 top-0 z-[60] flex h-[64px] items-center justify-between rounded-b-[24px] bg-white px-5 pt-1 shadow-[0_8px_20px_rgba(0,0,0,.24)] sm:px-8">
        <a href="#top" onClick={() => { setIsCalculatorOpen(false); setIsFeasibilityPage(false); setIsEligibilityPage(false) }} aria-label="DiSun Energy International home" className="h-10 w-14 origin-left overflow-hidden rounded-lg bg-white"><img src={markImage} alt="DiSun Energy International logo" className="h-full w-full object-cover object-center" /></a>
        <div className="flex items-center gap-3 text-[#1260a4]" aria-label="Social links">
          <a href="https://www.facebook.com/solar.disunenergy" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid size-7 place-items-center rounded-full border-2 border-[#1260a4] text-[#1260a4] transition-transform hover:scale-105"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] fill-current"><path d="M13.5 21.5v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.4v8h3.1Z" /></svg></a>
          <a href="https://www.instagram.com/solar.disunenergy" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid size-7 place-items-center rounded-full border-2 border-[#1260a4] text-[#1260a4] transition-transform hover:scale-105"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2.4"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" className="fill-current stroke-none" /></svg></a>
        </div>
      </header>

      <section id="top" className="relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-5 pt-[92px] text-center sm:pt-28">
        <p className="text-[15px] font-semibold tracking-[0.04em] text-white sm:text-lg">DiSun Energy International</p>
        <h1 className="mt-5 text-[31px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-5xl">POWER YOUR FUTURE<br /><span className="text-[43px] text-[#79d52a] sm:text-6xl">WITH SOLAR</span></h1>
        <p className="mx-auto mt-3 max-w-[320px] text-[13px] leading-[1.45] text-white sm:text-base">
          Calculate required solar power, Check transformer<br />
          Feasibility, and take the next step towards<br />
          <strong>Powerful future with SOLAR</strong>
        </p>
        <dl className="mx-auto mt-6 grid w-full max-w-[370px] grid-cols-3 divide-x divide-white/35"><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 78000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">PM SURYA GHAR<br />SUBSIDY</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Up to<br /><span className="text-xl sm:text-2xl">₹ 200000</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">BANK LOAN<br />AVAILABLE</dt></div><div className="px-2"><dd className="text-[13px] font-semibold leading-tight sm:text-lg">Panels with<br /><span className="text-xl sm:text-2xl">30 YEARS</span></dd><dt className="mt-2 text-[9px] leading-[1.35] tracking-[0.05em] text-white/80">WARRANTY<br />ASSURANCE</dt></div></dl>
        <div className="mt-auto pt-6"><p className="mb-3 text-center text-[14px] font-medium leading-[1.15] tracking-[0.01em] sm:text-lg">How much Power required<br /><span className="text-[20px] font-extrabold sm:text-2xl">for your home?</span></p><button type="button" disabled={isCreatingLead} onClick={async () => { if (isCreatingLead) return; setIsCalculatorOpen(true); setIsFeasibilityPage(false); setIsEligibilityPage(false); setResult(null); setFeasibilityResult(null); setLeadSaveError(''); requestAnimationFrame(() => sheetRef.current?.scrollTo({ top: 0 })); await createLead() }} className="mx-auto flex min-h-12 max-w-[245px] items-center justify-center rounded-full bg-white px-7 text-sm font-extrabold tracking-[0.06em] text-[#06152d] shadow-[0_5px_18px_rgba(255,255,255,.18)] transition-transform hover:scale-[1.03] disabled:cursor-wait disabled:opacity-70">{isCreatingLead ? 'STARTING...' : 'CALCULATE NOW'} <span className="ml-2 text-[#2e8dbe]">&gt;</span></button><p className="mt-5 text-xs text-white/90">By continuing, you agree to our <a className="underline" href="/privacy-policy">Privacy policy</a> and <a className="underline" href="/terms-of-service">Terms&amp;Conditions</a></p></div>
      </section>
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#03132f]/95 pt-[78px]" role="dialog" aria-modal="true" aria-labelledby="calculator-title">
          <button type="button" aria-label="Close calculator" className="absolute inset-0 cursor-default" onClick={() => setIsCalculatorOpen(false)} />
          <section ref={sheetRef} className="relative isolate h-[calc(100dvh-94px)] w-[calc(100%-24px)] overflow-x-hidden overflow-y-auto rounded-[28px] bg-white px-4 pb-3 pt-2 text-[#071528] shadow-[0_12px_32px_rgba(0,0,0,.28)] animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 z-40 -mx-4 flex h-12 shrink-0 isolate items-center justify-between bg-white px-4 pb-1 pt-0 shadow-[0_3px_8px_rgba(7,21,40,.08)] before:absolute before:-inset-x-1 before:-top-2 before:-z-10 before:h-12 before:bg-white before:content-['']"><button type="button" onClick={() => { if (isEligibilityPage) setIsEligibilityPage(false); else if (isFeasibilityPage) setIsFeasibilityPage(false); else setIsCalculatorOpen(false) }} aria-label={isEligibilityPage ? "Back to transformer feasibility" : isFeasibilityPage ? "Back to solar calculation" : "Close calculator"} className="grid size-10 place-items-center text-3xl font-light">←</button><div className="flex items-center justify-center gap-1" aria-hidden="true"><span className="h-1 w-5 rounded-full bg-[#1260a4]" /><span className={`h-1 w-5 rounded-full ${isFeasibilityPage || isEligibilityPage ? 'bg-[#1260a4]' : 'bg-slate-300'}`} /><span className={`h-1 w-5 rounded-full ${isEligibilityPage ? 'bg-[#1260a4]' : 'bg-slate-300'}`} /></div><button type="button" onClick={() => setIsCalculatorOpen(false)} aria-label="Close calculator" className="grid size-10 place-items-center text-3xl font-light">×</button></div>
            <h2 className={`${isFeasibilityPage ? 'hidden' : ''} relative z-0 mt-2 px-2 text-center text-2xl font-extrabold leading-[1.05] tracking-[-.04em]`}>SOLAR POWER<br />CALCULATOR</h2>
            {leadSaveError && !isFeasibilityPage && !isEligibilityPage && <div className="mx-2 mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[10px] font-semibold text-red-700">{leadSaveError}<button type="button" onClick={() => { setLeadSaveError(''); void createLead() }} disabled={isCreatingLead} className="ml-2 underline disabled:opacity-50">{isCreatingLead ? 'STARTING...' : 'RETRY'}</button></div>}
            <p className={isFeasibilityPage ? 'hidden' : 'mt-1 text-center text-[8.4px] font-bold tracking-[0.12em]'}>CALCULATION BASED ON</p>
            <div className={isFeasibilityPage ? 'hidden' : 'mt-1 grid grid-cols-2 overflow-hidden rounded-t-xl border border-slate-300 text-[9px] font-bold leading-none'}><button type="button" onClick={() => setCalculationMode('bill')} className={`flex min-h-11 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'bill' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY BILL (₹)</button><button type="button" onClick={() => setCalculationMode('units')} className={`flex min-h-11 items-center justify-center whitespace-nowrap px-2 text-center ${calculationMode === 'units' ? 'bg-[#159600] text-white' : 'bg-slate-200 text-slate-500'}`}>AVG. MONTHLY UNITS (KWH)</button></div>
            <form onSubmit={validateAndSubmit} className={isFeasibilityPage || isEligibilityPage ? 'hidden' : 'border-x border-b border-[#8bd35c] px-3 py-2'} noValidate>
              <div className="grid grid-cols-2 items-start gap-3">
                <label className="block text-[10px] font-medium leading-tight">{calculationMode === 'bill' ? <>AVERAGE MONTHLY<br />ELECTRICITY BILL (₹)</> : <><span className="block whitespace-nowrap">AVERAGE MONTHLY</span><span className="block whitespace-nowrap">CONSUMPTION (KWH)</span></>}<span className="relative mt-1 block"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium">{calculationMode === 'bill' ? '₹' : 'KWH'}</span><input value={form.bill} onChange={(event) => updateField('bill', event.target.value.replace(/\D/g, ''))} className={`h-10 w-full rounded-lg border pl-9 pr-8 text-sm outline-none focus:border-[#159600] ${errors.bill ? 'border-red-500' : 'border-slate-400'}`} inputMode="numeric" aria-invalid={Boolean(errors.bill)} onBlur={(event) => validateField('bill', event.target.value)} /><span className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col"><button type="button" aria-label="Increase value" className="h-4 px-1 text-xs leading-none" onClick={() => updateField('bill', String(Number(form.bill || 0) + 100))}>▲</button><button type="button" aria-label="Decrease value" className="h-4 px-1 text-xs leading-none" onClick={() => updateField('bill', String(Math.max(0, Number(form.bill || 0) - 100)))}>▼</button></span></span>{errors.bill && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.bill}</span>}</label>
                <label className="block text-[10px] font-medium leading-tight">CONNECTION<br />CATEGORY<select value={form.category} data-placeholder={!form.category} onChange={(event) => updateField('category', event.target.value)} onBlur={(event) => validateField('category', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.category ? 'border-red-500' : 'border-slate-400'}`}><option value="" className="text-gray-400">Select</option><option value="Domestic">Domestic</option><option value="Commercial">Commercial</option></select>{errors.category && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.category}</span>}</label>
              </div>
              <p className="mt-1 whitespace-nowrap pt-0 text-[7px] leading-none tracking-[-0.03em] text-slate-500">{calculationMode === 'bill' ? 'Tip: If your KSEB bill is bi-monthly, divide the bill amount by 2 to get your monthly average.' : 'Tip: If your KSEB bill is bi-monthly, divide total units by 2 to get your monthly average.'}</p>
              <div className="mt-2 border-t border-slate-200 pt-2"><div className="space-y-2">
                <label className="block text-[10px] font-medium">FULL NAME<input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} onBlur={(event) => validateField('fullName', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.fullName ? 'border-red-500' : 'border-slate-400'}`} />{errors.fullName && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.fullName}</span>}</label>
                <label className="block text-[10px] font-medium">PHONE NUMBER<input value={form.phone} onChange={(event) => updateField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={(event) => validateField('phone', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.phone ? 'border-red-500' : 'border-slate-400'}`} inputMode="numeric" maxLength={10} />{errors.phone && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.phone}</span>}</label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-[10px] font-medium">DISTRICT<select value={form.district} data-placeholder={!form.district} onChange={(event) => updateField('district', event.target.value)} onBlur={(event) => validateField('district', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:border-[#159600] ${errors.district ? 'border-red-500' : 'border-slate-400'}`}><option value="" className="text-gray-400">Select district</option>{keralaDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>{errors.district && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.district}</span>}</label><label className="block text-[10px] font-medium">AREA<input value={form.area} onChange={(event) => updateField('area', event.target.value)} onBlur={(event) => validateField('area', event.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-2 text-sm outline-none focus:border-[#159600] ${errors.area ? 'border-red-500' : 'border-slate-400'}`} />{errors.area && <span className="mt-1 block text-[9px] font-normal text-red-600">{errors.area}</span>}</label></div>
                <label className="mt-3 flex items-start gap-2 text-[9px] leading-[1.25] text-slate-600"><input type="checkbox" checked={privacyConsent} onChange={(event) => { setPrivacyConsent(event.target.checked); setErrors((current) => ({ ...current, consent: '' })) }} className="mt-0.5 size-3 accent-[#1260a4]" /> <span>I agree to the <a href="/privacy-policy" target="_blank" rel="noreferrer" className="font-semibold underline">Privacy Policy</a> and <a href="/terms-of-service" target="_blank" rel="noreferrer" className="font-semibold underline">Terms & Conditions</a>.</span></label>{errors.consent && <span className="mt-1 block text-[9px] text-red-600">{errors.consent}</span>}
                <button type="submit" className="mt-3 flex min-h-10 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white shadow-none">SUBMIT</button>
                {isCalculating && <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500"><span className="size-3 animate-spin rounded-full border-2 border-[#159600]/25 border-t-[#159600]" />Preparing your solar estimate...</div>}
                {leadSaveError && <p className="mx-auto mb-3 max-w-md text-center text-[9px] font-semibold text-red-600">{leadSaveError}</p>}
                {result && <div ref={resultRef} className="mt-0 space-y-2 animate-in fade-in duration-500"><div className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center"><div className="border-b border-slate-200 pb-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recommended plant</p><p className="mt-1 text-3xl font-extrabold text-[#168566]">{result.kw} <span className="text-lg">kW</span></p></div><div className="pt-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Approx. roof area</p><p className="mt-1 text-xl font-extrabold text-[#293244]">{result.roofMin}–{result.roofMax} sq ft</p></div></div><div className="rounded-2xl border-2 border-slate-200 bg-white p-2.5 text-[10px]"><div className="flex justify-between gap-2"><span>Estimated Total Setup Cost:</span><strong>₹ {result.cost.toLocaleString('en-IN')}</strong></div><div className="mt-1.5 flex justify-between gap-2 text-[#168566]"><span>- PM Surya Ghar Govt Subsidy:<small className="block text-slate-400">(Central Govt Grant)</small></span><strong>-₹ {result.subsidy.toLocaleString('en-IN')}</strong></div><div className="mt-1.5 flex justify-between gap-2 text-[#168566]"><span>- Maximum Bank Loan:<small className="block text-slate-400">(Up to)</small></span><strong>-₹ {result.loan.toLocaleString('en-IN')}</strong></div></div><div className="rounded-2xl border-2 border-[#9cc8ff] bg-white p-3"><div className="flex items-center justify-between gap-2 text-sm font-extrabold"><span>Est. Out-of-Pocket Cost:</span><strong className="text-base text-[#168566]">₹ {result.netCost.toLocaleString('en-IN')}</strong></div></div><button type="button" onClick={() => setIsFeasibilityPage(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1260a4] bg-white px-6 text-sm font-extrabold tracking-[0.08em] text-[#1260a4] shadow-none">CHECK FEASIBILITY <span aria-hidden="true" className="text-lg leading-none">→</span></button></div>}
              </div></div>
            </form>
            {isFeasibilityPage && !isEligibilityPage && (
  <form onSubmit={submitFeasibility} className="px-2 pb-2 pt-2 text-center">
    <h2 className="text-xl font-extrabold leading-tight tracking-[-.04em]">CHECK TRANSFORMER<br />FEASIBILITY</h2>
    {feasibilityErrors.lookup && <p className="mb-3 text-left text-[9px] font-normal text-red-600">{feasibilityErrors.lookup}</p>}
    {ksebLoadError && <p className="mb-3 text-left text-[9px] font-normal text-red-600">{ksebLoadError}</p>}
    <div className="mt-2 space-y-2 text-left">
      <label className="block text-[10px] font-medium">
        KSEB CONSUMER NUMBER
        <input value={feasibilityForm.consumerNumber} onChange={(event) => { const cleaned = event.target.value.replace(/[^\d\s-]/g, '').slice(0, 20); setFeasibilityForm((current) => ({ ...current, consumerNumber: cleaned })); setFeasibilityErrors((current) => ({ ...current, consumerNumber: '', lookup: '' })) }} onBlur={() => { const value = feasibilityForm.consumerNumber.replace(/[\s-]/g, ''); if (!value) setFeasibilityErrors((current) => ({ ...current, consumerNumber: 'Consumer number is required.' })); else if (!/^\d{13}$/.test(value)) setFeasibilityErrors((current) => ({ ...current, consumerNumber: 'Please enter a valid 13-digit KSEB Consumer Number.' })) }} className={`mt-1 h-9 w-full rounded-lg border ${feasibilityErrors.consumerNumber ? 'border-red-500' : 'border-slate-400'} px-2 text-sm outline-none focus:border-[#159600]`} inputMode="numeric" />
        {feasibilityErrors.consumerNumber && <span className="mt-1 block text-[9px] font-normal text-red-600">{feasibilityErrors.consumerNumber}</span>}
      </label>

      <div className="space-y-3">
        <label className="block text-[10px] font-medium">
          NAME OF DISTRICT
          <select value={feasibilityForm.districtId} onFocus={loadKsebDistricts} onChange={(event) => selectKsebDistrict(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm outline-none focus:border-[#159600]">
            <option value="">{isLoadingDistricts ? 'Loading districts...' : 'Select District'}</option>
            {ksebDistricts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
          </select>
        </label>

        <label className="block text-[10px] font-medium">
          SECTION OFFICE
          <select value={feasibilityForm.sectionId} onChange={(event) => selectKsebSection(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm outline-none focus:border-[#159600]">
            <option value="">{isLoadingSections ? 'Loading sections...' : 'Select Section'}</option>
            {ksebSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
          </select>
        </label>

        <label className="block text-[10px] font-medium">
          TRANSFORMER
          <select value={feasibilityForm.transformerId} onChange={(event) => { const selected = ksebTransformers.find((transformer) => transformer.id === event.target.value); setFeasibilityForm((current) => ({ ...current, transformerId: event.target.value, transformerName: selected?.transformerName ?? '' })); setFeasibilityResult(null); }} className="mt-1 h-9 w-full rounded-lg border border-slate-400 bg-white px-2 text-sm outline-none focus:border-[#159600]">
            <option value="">{isLoadingTransformers ? 'Loading transformers...' : 'Select Transformer'}</option>
            {ksebTransformers.map((transformer) => <option key={transformer.id} value={transformer.id}>{transformer.transformerName}</option>)}
          </select>
        </label>
      </div>

      <button type="submit" className="mt-3 flex min-h-10 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white shadow-none">
        {isCheckingFeasibility ? 'CHECKING...' : 'CHECK FEASIBILITY'}
      </button>

      {isCheckingFeasibility && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
          <span className="size-3 animate-spin rounded-full border-2 border-[#159600]/25 border-t-[#159600]" />
          Checking transformer feasibility...
        </div>
      )}

      {feasibilityResult && (
        <>
          <div className={`mt-4 rounded-2xl border-2 p-4 text-left text-xs ${feasibilityResult.success ? 'border-[#8bd35c]' : 'border-amber-300'}`}>
            <h3 className="text-center text-base font-extrabold">
              {Boolean(feasibilityResult.success)
                ? (feasibilityResult.status === 'PRELIMINARILY_FEASIBLE'
                  ? 'Preliminarily Feasible'
                  : String(feasibilityResult.status ?? '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()))
                : String(feasibilityResult.message ?? 'KSEB capacity data is unavailable.')}
            </h3>

            {Boolean(feasibilityResult.success) && (() => {
              const balanceAvailableKw = Number((feasibilityResult.transformer as { balanceAvailableKw?: number })?.balanceAvailableKw ?? 0)

              return (
                <div className="mt-3 space-y-2 leading-relaxed">
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>Section Office</strong><br />{String((feasibilityResult.section as { name?: string })?.name ?? '')}</p>
                    <p><strong>Transformer</strong><br />{String((feasibilityResult.transformer as { transformerName?: string })?.transformerName ?? '')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                    <span>90% DTR Capacity<br /><strong>{String((feasibilityResult.transformer as { allowedCapacityKw?: number })?.allowedCapacityKw)} kW</strong></span>
                    <span>Feasibility Issued<br /><strong>{String((feasibilityResult.transformer as { feasibilityIssuedKw?: number })?.feasibilityIssuedKw)} kW</strong></span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 text-center">
                    <p className="text-center font-semibold text-slate-700">Balance Available</p>
                    <strong className={`mt-1 block text-base ${balanceAvailableKw <= 30 ? 'text-red-600' : 'text-green-600'}`}>{balanceAvailableKw} kW</strong>
                  </div>
                  <p className="mt-3 border-t border-slate-200 pt-2 text-left text-[7px] leading-[1.2] tracking-[-0.01em] text-slate-500 whitespace-nowrap">
                    <span className="block">This is a preliminary capacity check based on publicly retrieved KSEB data.</span>
                    <span className="block">Final feasibility and approval remain subject to KSEB&apos;s official process.</span>
                  </p>
                </div>
              )
            })()}
          </div>
          <button
            type="button"
            onClick={() => { setIsEligibilityPage(true); setEligibilitySubmitted(false); requestAnimationFrame(() => sheetRef.current?.scrollTo({ top: 0, behavior: 'smooth' })) }}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[#1260a4] bg-white px-6 text-sm font-extrabold tracking-[0.08em] text-[#1260a4] shadow-none"
          >
            CHECK ELIGIBILITY <span aria-hidden="true" className="ml-2 text-lg leading-none">→</span>
          </button>
        </>
      )}
    </div>
  </form>
)}
            {isEligibilityPage && (
              <div className="px-2 pb-6 pt-2">
                <h2 className="text-xl font-extrabold leading-tight tracking-[-.04em] text-center">CHECK LOAN &amp; SUBSIDY ELIGIBILITY</h2>
                <p className="mt-1 text-center text-[10px] font-medium text-slate-500">Provide your documents to calculate loan &amp; Subsidy eligibility</p>

                <form onSubmit={submitEligibility} className="mt-4 space-y-3" noValidate>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['aadhaar', 'Aadhaar Card'],
                      ['pan', 'PAN Card'],
                      ['bill', 'Latest KSEB Bill'],
                      ['passbook', 'Bank Passbook'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="block cursor-pointer text-left text-[10px] font-medium">
                        <span className="block mb-1">{label} <span className="text-red-500">*</span></span>
                        <span className={`flex min-h-14 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed ${eligibilityErrors[key] ? 'border-red-500' : 'border-slate-300'} bg-slate-50 px-2 text-center`}>
                          <span className="text-xl text-[#1260a4]">↑</span>
                          <span className="mt-1 text-[9px] text-slate-500">{eligibilityFiles[key] ? eligibilityFiles[key]!.name : 'Tap to upload'}</span>
                        </span>
                        <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; setEligibilityFiles((current) => ({ ...current, [key]: file })); setEligibilityErrors((current) => ({ ...current, [key]: '' })); }} />
                        {eligibilityErrors[key] && <span className="mt-1 block text-[8px] text-red-600">{eligibilityErrors[key]}</span>}
                      </label>
                    ))}
                  </div>

                  <button type="submit" disabled={eligibilitySubmitting} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white disabled:opacity-60">{eligibilitySubmitting ? 'UPLOADING...' : 'SUBMIT'}</button>
                  {eligibilitySubmitError && <p className="mt-2 text-center text-[9px] text-red-600">{eligibilitySubmitError}</p>}
                </form>

                {eligibilitySubmitted && (
                  <div className="mt-4 rounded-xl border border-[#8bd35c] bg-[#f5fff0] px-3 py-3 text-center text-[11px] font-semibold text-[#1260a4]">
                    Application received. Our executive will contact you soon.
                  </div>
                )}

                <section className="mt-6 rounded-2xl border-2 border-[#1260a4] bg-white p-4 text-left shadow-[0_6px_18px_rgba(18,96,164,.12)]">
                      <h3 className="text-center text-xl font-extrabold leading-tight text-[#071528]">READY TO GO SOLAR?</h3>
                      <p className="mt-1 text-center text-sm font-bold text-[#1260a4]">Book your free site visit</p>

                      <form onSubmit={submitSiteVisit} className="mt-4 space-y-3" noValidate>
                        <label className="block text-[10px] font-medium">NAME
                          <input value={siteVisit.name} onChange={(event) => { setSiteVisit((current) => ({ ...current, name: event.target.value })); setSiteVisitErrors((current) => ({ ...current, name: '' })) }} className={`mt-1 h-10 w-full rounded-lg border ${siteVisitErrors.name ? 'border-red-500' : 'border-slate-400'} px-2 text-sm outline-none focus:border-[#159600]`} />
                          {siteVisitErrors.name && <span className="mt-1 block text-[9px] text-red-600">{siteVisitErrors.name}</span>}
                        </label>
                        <label className="block text-[10px] font-medium">PHONE NUMBER
                          <input value={siteVisit.phone} onChange={(event) => { setSiteVisit((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })); setSiteVisitErrors((current) => ({ ...current, phone: '' })) }} inputMode="numeric" maxLength={10} className={`mt-1 h-10 w-full rounded-lg border ${siteVisitErrors.phone ? 'border-red-500' : 'border-slate-400'} px-2 text-sm outline-none focus:border-[#159600]`} />
                          {siteVisitErrors.phone && <span className="mt-1 block text-[9px] text-red-600">{siteVisitErrors.phone}</span>}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block text-[10px] font-medium">PREFERRED DATE
                            <input type="date" min={new Date().toISOString().split('T')[0]} value={siteVisit.date} onChange={(event) => { setSiteVisit((current) => ({ ...current, date: event.target.value })); setSiteVisitErrors((current) => ({ ...current, date: '' })) }} className={`mt-1 h-10 w-full rounded-lg border ${siteVisitErrors.date ? 'border-red-500' : 'border-slate-400'} bg-white px-2 text-sm outline-none focus:border-[#159600]`} />
                            {siteVisitErrors.date && <span className="mt-1 block text-[9px] text-red-600">{siteVisitErrors.date}</span>}
                          </label>
                          <label className="block text-[10px] font-medium">PREFERRED TIME
                            <input type="time" value={siteVisit.time} onChange={(event) => { setSiteVisit((current) => ({ ...current, time: event.target.value })); setSiteVisitErrors((current) => ({ ...current, time: '' })) }} className={`mt-1 h-10 w-full rounded-lg border ${siteVisitErrors.time ? 'border-red-500' : 'border-slate-400'} bg-white px-2 text-sm outline-none focus:border-[#159600]`} />
                            {siteVisitErrors.time && <span className="mt-1 block text-[9px] text-red-600">{siteVisitErrors.time}</span>}
                          </label>
                        </div>
                        <label className="block text-[10px] font-medium">EXACT LOCATION
                          <textarea value={siteVisit.location} onChange={(event) => { setSiteVisit((current) => ({ ...current, location: event.target.value })); setSiteVisitErrors((current) => ({ ...current, location: '' })) }} rows={2} placeholder={locationLoading ? 'Fetching exact location...' : 'Enter exact location'} className={`mt-1 w-full resize-none rounded-lg border ${siteVisitErrors.location ? 'border-red-500' : 'border-slate-400'} px-2 py-2 text-sm outline-none focus:border-[#159600]`} />
                          <button type="button" onClick={requestLocation} className="mt-1 text-[9px] font-bold text-[#1260a4] underline">{locationLoading ? 'Fetching location...' : 'Use my current location'}</button>
                          {locationMessage && <span className="mt-1 block text-[8px] text-slate-500">{locationMessage}</span>}
                          {siteVisitMessage && <span className="mt-1 block text-[9px] font-semibold text-[#1260a4]">{siteVisitMessage}</span>}
                          {siteVisitErrors.location && <span className="mt-1 block text-[9px] text-red-600">{siteVisitErrors.location}</span>}
                        </label>
                        <button type="submit" disabled={siteVisitSubmitting} className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full bg-[#1260a4] px-6 text-sm font-extrabold tracking-[0.08em] text-white disabled:opacity-60">{siteVisitSubmitting ? 'BOOKING...' : 'BOOK NOW'}</button>
                      </form>
                </section>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

