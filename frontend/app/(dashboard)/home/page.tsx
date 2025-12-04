'use client'

import { Input } from '@/components/ui/Input'
import { ROXSelect } from '@/components/ui/ROXSelect'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { InfoModal } from '@/components/ui/InfoModal'
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { COLLEGES } from '@/lib/colleges'
import { FACTOR_DESCRIPTIONS } from '@/lib/factorDescriptions'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Star,
  Brain,
  ChevronRight,
  UploadCloud,
  FileText,
  ListChecks,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MajorSelectionModal } from '@/components/ui/MajorSelectionModal'
import { SaveModal } from '@/components/SaveModal'
import { PresetStorage } from '@/lib/preset-storage'
import {
  parseApplicationData,
  FIELD_LABELS,
  ApplicationMetric,
  ProfileField,
  MiscCategory,
  getMiscCategory,
  ParseDiagnostic
} from '@/lib/applicationParser'

export const dynamic = 'force-dynamic'

type Profile = {
  gpa_unweighted: string
  gpa_weighted: string
  sat: string
  act: string
  rigor: string
  ap_count: string
  honors_count: string
  class_rank_percentile: string
  class_size: string
  extracurricular_depth: string
  leadership_positions: string
  awards_publications: string
  passion_projects: string
  business_ventures: string
  volunteer_work: string
  research_experience: string
  portfolio_audition: string
  essay_quality: string
  recommendations: string
  interview: string
  demonstrated_interest: string
  legacy_status: string
  hs_reputation: string
  major: string
  college: string
  geographic_diversity: string
  plan_timing: string
  geography_residency: string
  firstgen_diversity: string
  ability_to_pay: string
  policy_knob: string
  conduct_record: string
  misc: string[]
}

const MISC_CATEGORY_META: Record<MiscCategory, { label: string; accent: string; bullet: string }> = {
  testing: { label: 'Testing & Scores', accent: 'text-blue-200', bullet: 'text-blue-300' },
  academics: { label: 'Academics & Coursework', accent: 'text-emerald-200', bullet: 'text-emerald-300' },
  awards: { label: 'Awards & Honors', accent: 'text-purple-200', bullet: 'text-purple-300' },
  projects: { label: 'Projects & Research', accent: 'text-sky-200', bullet: 'text-sky-300' },
  leadership: { label: 'Leadership & Clubs', accent: 'text-orange-200', bullet: 'text-orange-300' },
  service: { label: 'Service & Volunteering', accent: 'text-rose-200', bullet: 'text-rose-300' },
  work: { label: 'Jobs & Internships', accent: 'text-amber-200', bullet: 'text-amber-300' },
  general: { label: 'General Highlights', accent: 'text-gray-200', bullet: 'text-yellow-300' }
}

const MISC_CATEGORY_SEQUENCE: MiscCategory[] = [
  'testing',
  'academics',
  'awards',
  'projects',
  'leadership',
  'service',
  'work',
  'general'
]

const SHOW_PARSE_DEBUG_PANEL = process.env.NEXT_PUBLIC_PARSE_DEBUG === 'true'

const initialProfile: Profile = {
    gpa_unweighted: '',
    gpa_weighted: '',
    sat: '',
    act: '',
    rigor: '5',
  ap_count: '',
  honors_count: '',
  class_rank_percentile: '',
  class_size: '',
    extracurricular_depth: '5',
    leadership_positions: '5',
    awards_publications: '5',
    passion_projects: '5',
    business_ventures: '5',
    volunteer_work: '5',
    research_experience: '5',
    portfolio_audition: '5',
    essay_quality: '5',
    recommendations: '5',
    interview: '5',
    demonstrated_interest: '5',
    legacy_status: '5',
    hs_reputation: '5',
    major: '',
    college: '',
    geographic_diversity: '5',
    plan_timing: '5',
    geography_residency: '5',
    firstgen_diversity: '5',
    ability_to_pay: '5',
    policy_knob: '5',
  conduct_record: '9',
  misc: []
}

const PROFILE_FIELD_DEFAULTS: Record<ProfileField, string> = (
  Object.keys(FIELD_LABELS) as Array<ProfileField>
).reduce((acc, field) => {
  const defaultValue = initialProfile[field as keyof Profile]
  acc[field] = typeof defaultValue === 'string' ? defaultValue : ''
  return acc
}, {} as Record<ProfileField, string>)

type UpdateOptions = {
  autoFilled?: boolean
}

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [modalInfo, setModalInfo] = useState<{ isOpen: boolean; factor: string }>({
    isOpen: false,
    factor: ''
  })

  // Major modal state
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false)

  // Save preset modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)

  // Preset storage
  const storage = new PresetStorage()

  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<keyof Profile>>(new Set())
  const [userEditedFields, setUserEditedFields] = useState<Set<ProfileField>>(new Set())
  const [miscInput, setMiscInput] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null)
  const [autoFillInsights, setAutoFillInsights] = useState<AutoFillInsight[]>([])
  const [pendingOverrides, setPendingOverrides] = useState<Partial<Record<ProfileField, string>> | null>(null)
  const [pendingOverrideFields, setPendingOverrideFields] = useState<ProfileField[]>([])
  const [overrideSelections, setOverrideSelections] = useState<Partial<Record<ProfileField, boolean>>>({})
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [parseDiagnostics, setParseDiagnostics] = useState<ParseDiagnostic[]>([])
  const [showParseDebugger, setShowParseDebugger] = useState(SHOW_PARSE_DEBUG_PANEL)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedOverrideCount = pendingOverrideFields.reduce(
    (count, field) => (overrideSelections[field] ? count + 1 : count),
    0
  )
  const miscGroups = useMemo(() => {
    const grouped: Record<MiscCategory, string[]> = {
      testing: [],
      academics: [],
      awards: [],
      projects: [],
      leadership: [],
      service: [],
      work: [],
      general: []
    }
    profile.misc.forEach(item => {
      const category = getMiscCategory(item)
      grouped[category].push(item)
    })
    return grouped
  }, [profile.misc])
  const hasMiscEntries = profile.misc.length > 0

  const isProfileFieldKey = (field: keyof Profile): field is ProfileField => {
    return field in FIELD_LABELS
  }

  const touchProfileFields = (fields: ProfileField[], wasAutoFilled?: boolean) => {
    if (!fields.length) return
    setUserEditedFields(prev => {
      const next = new Set(prev)
      fields.forEach(field => {
        if (wasAutoFilled) {
          next.delete(field)
        } else {
          next.add(field)
        }
      })
      return next
    })
  }

  const updateProfile = <K extends keyof Profile>(field: K, value: Profile[K], options?: UpdateOptions) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setAutoFilledFields(prev => {
      const next = new Set(prev)
      if (options?.autoFilled) {
        next.add(field)
      } else {
        next.delete(field)
      }
      return next
    })
    if (isProfileFieldKey(field)) {
      touchProfileFields([field], options?.autoFilled)
    }
  }

  const resetOverrideModalState = () => {
    setPendingOverrides(null)
    setPendingOverrideFields([])
    setOverrideSelections({})
    setIsOverrideModalOpen(false)
  }

  const applyOverrides = (fieldsToApply: ProfileField[]) => {
    if (!pendingOverrides || !pendingOverrideFields.length) {
      resetOverrideModalState()
      return
    }

    const updates: Partial<Record<ProfileField, string>> = {}
    fieldsToApply.forEach(field => {
      const newValue = pendingOverrides[field]
      if (typeof newValue !== 'undefined') {
        updates[field] = newValue
      }
    })

    if (Object.keys(updates).length) {
      updateProfileBulk(updates as Partial<Profile>, { autoFilled: true })
    }

    setAutoFillInsights(prev =>
      prev.map(insight => {
        if (!insight.field || !pendingOverrideFields.includes(insight.field)) {
          return insight
        }
        if (fieldsToApply.includes(insight.field)) {
          return { ...insight, status: 'applied' }
        }
        return { ...insight, status: 'skipped' }
      })
    )

    const summary =
      fieldsToApply.length > 0
        ? `Applied ${fieldsToApply.length} override${fieldsToApply.length === 1 ? '' : 's'}`
        : 'Kept your existing entries'

    setUploadMessage(prev => (prev ? `${prev} · ${summary}` : summary))
    resetOverrideModalState()
  }

  const applySelectedOverrides = () => {
    const selected = pendingOverrideFields.filter(field => overrideSelections[field])
    applyOverrides(selected)
  }

  const applyAllOverrides = () => applyOverrides(pendingOverrideFields)
  const skipOverrides = () => applyOverrides([])

  const toggleOverrideSelection = (field: ProfileField, useApplication: boolean) => {
    setOverrideSelections(prev => ({
      ...prev,
      [field]: useApplication
    }))
  }

  const setAllOverrideSelections = (useApplication: boolean) => {
    const nextSelections: Partial<Record<ProfileField, boolean>> = {}
    pendingOverrideFields.forEach(field => {
      nextSelections[field] = useApplication
    })
    setOverrideSelections(nextSelections)
  }

  const updateProfileBulk = (updates: Partial<Profile>, options?: UpdateOptions) => {
    if (!Object.keys(updates).length) return
    setProfile(prev => ({ ...prev, ...updates }))
    setAutoFilledFields(prev => {
      const next = new Set(prev)
      Object.keys(updates).forEach(key => {
        const typedKey = key as keyof Profile
        if (options?.autoFilled) {
          next.add(typedKey)
        } else {
          next.delete(typedKey)
        }
      })
      return next
    })
    const touchedFields = Object.keys(updates).filter(key =>
      isProfileFieldKey(key as keyof Profile)
    ) as ProfileField[]
    if (touchedFields.length) {
      touchProfileFields(touchedFields, options?.autoFilled)
    }
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
    event.target.value = ''
  }

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingFile(false)
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    if (!isSupportedFileType(file)) {
      setUploadError('Unsupported type. Please upload a PDF or Word (.docx) file.')
      setUploadMessage(null)
      return
    }

    setUploadError(null)
    setUploadMessage(null)
    setIsParsingFile(true)
    setParseDiagnostics([])

    try {
      const text = await extractTextFromFile(file)
      if (!text || !text.trim()) {
        setUploadMessage('Unable to extract readable text from that file.')
        return
      }

      const parsed = await parseApplicationData(text)
      setParseDiagnostics(parsed.diagnostics ?? [])
      const blankUpdates: Partial<Record<ProfileField, string>> = {}
      const conflictUpdates: Partial<Record<ProfileField, string>> = {}
      const keptFields = new Set<ProfileField>()

      Object.entries(parsed.updates).forEach(([key, value]) => {
        const typedKey = key as ProfileField
        const currentValue = profile[typedKey]
        if (typeof currentValue === 'string') {
          const trimmedCurrent = currentValue.trim()
          const incomingValue = (value as string).trim()
          const defaultValue = PROFILE_FIELD_DEFAULTS[typedKey] ?? ''
          const matchesDefault = defaultValue.trim() === trimmedCurrent
          const hasExistingValue = trimmedCurrent && trimmedCurrent !== defaultValue.trim()

          // If field is empty or has default value, auto-fill it
          if (!trimmedCurrent || matchesDefault) {
            blankUpdates[typedKey] = incomingValue
          }
          // If values match exactly, keep it
          else if (trimmedCurrent === incomingValue) {
            keptFields.add(typedKey)
          }
          // If field has a non-default value and incoming differs, show conflict
          else {
            conflictUpdates[typedKey] = incomingValue
          }
        }
      })

      if (Object.keys(blankUpdates).length) {
        updateProfileBulk(blankUpdates, { autoFilled: true })
      }

      let miscAdded = 0
      if (parsed.misc.length) {
        const existingMisc = new Set(profile.misc.map(item => item.toLowerCase()))
        const newEntries = parsed.misc.filter(item => {
          const normalized = item.toLowerCase()
          if (normalized.length < 6 || existingMisc.has(normalized)) return false
          existingMisc.add(normalized)
          return true
        })
        if (newEntries.length) {
          updateProfile('misc', [...profile.misc, ...newEntries])
          miscAdded = newEntries.length
        }
      }

      const pendingFields = Object.keys(conflictUpdates) as ProfileField[]
      const insightsWithStatus: AutoFillInsight[] = parsed.metrics.map(metric => {
        if (metric.field && metric.mappedValue) {
          if (blankUpdates[metric.field]) {
            return { ...metric, status: 'applied' }
          }
          if (pendingFields.includes(metric.field)) {
            return { ...metric, status: 'pending' }
          }
          if (keptFields.has(metric.field)) {
            return { ...metric, status: 'kept' }
          }
        }
        return { ...metric, status: metric.mappedValue ? 'info' : 'info' }
      })
      setAutoFillInsights(insightsWithStatus)

      if (pendingFields.length) {
        setPendingOverrides(conflictUpdates)
        setPendingOverrideFields(pendingFields)
        const defaultSelections: Partial<Record<ProfileField, boolean>> = {}
        pendingFields.forEach(field => {
          defaultSelections[field] = true
        })
        setOverrideSelections(defaultSelections)
        setIsOverrideModalOpen(true)
      } else {
        setPendingOverrides(null)
        setPendingOverrideFields([])
        setOverrideSelections({})
        setIsOverrideModalOpen(false)
      }

      setLastUploadedFile(file.name)

      const appliedCount = Object.keys(blankUpdates).length
      const pendingCount = pendingFields.length
      const messageParts: string[] = []
      if (appliedCount) {
        messageParts.push(`Auto-filled ${appliedCount} field${appliedCount > 1 ? 's' : ''}`)
      }
      if (miscAdded) {
        messageParts.push(`Captured ${miscAdded} misc note${miscAdded > 1 ? 's' : ''}`)
      }
      if (pendingCount) {
        messageParts.push(
          `${pendingCount} field${pendingCount > 1 ? 's are' : ' is'} awaiting your approval`
        )
      }
      if (!messageParts.length) {
        messageParts.push('No new structured info detected. You can still add notes manually.')
      }
      setUploadMessage(messageParts.join(' · '))
    } catch (error) {
      console.error('Failed to process application file', error)
      setUploadError('Failed to process file. Please ensure it is not password protected.')
      setParseDiagnostics([])
    } finally {
      setIsParsingFile(false)
    }
  }

  // Major modal handlers
  const handleOpenMajorModal = () => {
    setIsMajorModalOpen(true)
  }

  const handleCloseMajorModal = () => {
    setIsMajorModalOpen(false)
  }

  const handleSelectMajor = (major: string) => {
    updateProfile('major', major)
  }

  const handleSavePreset = (name: string) => {
    storage.savePreset(name, profile.major, profile)
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 3000)
    setIsSaveModalOpen(false) // Close modal after saving
  }

  // Check for preset to load on mount
  useEffect(() => {
    const loadPresetData = sessionStorage.getItem('loadPreset')
    if (loadPresetData) {
      try {
        const preset = JSON.parse(loadPresetData)
        const nextProfile: Profile = {
          ...initialProfile,
          ...(preset.formData || {})
        }
        if (!Array.isArray(nextProfile.misc)) {
          nextProfile.misc = []
        }
        setProfile(nextProfile)
        setAutoFilledFields(new Set())
        sessionStorage.removeItem('loadPreset')
      } catch (error) {
        console.error('Failed to load preset:', error)
      }
    }
  }, [])

  // Handle trial mode (OAuth is handled by AuthProvider globally)
  useEffect(() => {
    const handleTrialMode = () => {
      if (typeof window !== 'undefined') {
        const trialMode = localStorage.getItem('trial_mode')
        if (trialMode === 'true') {
          // Trigger a custom event to notify header of trial mode
          window.dispatchEvent(new CustomEvent('trialModeChanged'))
        }
      }
    }

    handleTrialMode()
  }, []) // Only run on mount, not on profile changes

  // Save profile to localStorage separately (without triggering auth checks)
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(profile))
    // Dispatch profileUpdated event for college selection page, but NOT authStateChanged
    window.dispatchEvent(new CustomEvent('profileUpdated'))
  }, [profile])

  // Validation function to check if all required fields are filled
  const isProfileComplete = () => {
    const requiredFields: (keyof Profile)[] = ['gpa_unweighted', 'gpa_weighted']
    return requiredFields.every(field => typeof profile[field] === 'string' && (profile[field] as string).trim() !== '')
  }

  const openInfoModal = (factor: string) => {
    setModalInfo({ isOpen: true, factor })
  }

  const closeInfoModal = () => {
    setModalInfo({ isOpen: false, factor: '' })
  }

  const getFactorOptions = (factor: string) => {
    const factorDescriptions: { [key: string]: { [value: string]: string } } = {
      extracurricular_depth: {
        '10': '10 - Deep involvement in 2-3 activities',
        '8': '8 - Strong involvement in 1-2 activities',
        '6': '6 - Moderate involvement in multiple activities',
        '4': '4 - Light involvement in several activities',
        '2': '2 - Minimal or no extracurricular involvement'
      },
      leadership_positions: {
        '10': '10 - Multiple significant leadership roles',
        '8': '8 - Strong leadership in 1-2 roles',
        '6': '6 - Some leadership experience',
        '4': '4 - Minor leadership roles',
        '2': '2 - No leadership roles'
      },
      awards_publications: {
        '10': '10 - National/international recognition',
        '8': '8 - State/regional awards',
        '6': '6 - Local awards or publications',
        '4': '4 - School-level recognition',
        '2': '2 - No significant awards'
      },
      passion_projects: {
        '10': '10 - Exceptional personal projects',
        '8': '8 - Strong personal initiatives',
        '6': '6 - Some personal projects',
        '4': '4 - Basic personal projects',
        '2': '2 - No significant personal projects'
      },
      business_ventures: {
        '10': '10 - Successful business ventures',
        '8': '8 - Strong entrepreneurial experience',
        '6': '6 - Some business experience',
        '4': '4 - Basic business involvement',
        '2': '2 - No business experience'
      },
      volunteer_work: {
        '10': '10 - Extensive volunteer commitment',
        '8': '8 - Strong volunteer involvement',
        '6': '6 - Regular volunteer work',
        '4': '4 - Occasional volunteer work',
        '2': '2 - Minimal volunteer experience'
      },
      research_experience: {
        '10': '10 - Published research or significant projects',
        '8': '8 - Strong research involvement',
        '6': '6 - Some research experience',
        '4': '4 - Basic research exposure',
        '2': '2 - No research experience'
      },
      portfolio_audition: {
        '10': '10 - Exceptional portfolio/audition',
        '8': '8 - Strong portfolio/audition',
        '6': '6 - Good portfolio/audition',
        '4': '4 - Basic portfolio/audition',
        '2': '2 - No portfolio/audition required'
      },
      essay_quality: {
        '10': '10 - Exceptional writing quality',
        '8': '8 - Strong writing skills',
        '6': '6 - Good writing ability',
        '4': '4 - Basic writing skills',
        '2': '2 - Weak writing skills'
      },
      recommendations: {
        '10': '10 - Outstanding recommendations',
        '8': '8 - Strong recommendations',
        '6': '6 - Good recommendations',
        '4': '4 - Average recommendations',
        '2': '2 - Weak recommendations'
      },
      interview: {
        '10': '10 - Exceptional interview performance',
        '8': '8 - Strong interview skills',
        '6': '6 - Good interview performance',
        '4': '4 - Average interview',
        '2': '2 - Poor interview performance'
      },
      demonstrated_interest: {
        '10': '10 - High demonstrated interest',
        '8': '8 - Strong demonstrated interest',
        '6': '6 - Moderate demonstrated interest',
        '4': '4 - Basic demonstrated interest',
        '2': '2 - No demonstrated interest'
      },
      legacy_status: {
        '10': '10 - Strong legacy connection',
        '8': '8 - Moderate legacy connection',
        '6': '6 - Some legacy connection',
        '4': '4 - Weak legacy connection',
        '2': '2 - No legacy connection'
      },
      geographic_diversity: {
        '10': '10 - Highly underrepresented region',
        '8': '8 - Moderately underrepresented',
        '6': '6 - Somewhat underrepresented',
        '4': '4 - Slightly underrepresented',
        '2': '2 - Well-represented region'
      },
      firstgen_diversity: {
        '10': '10 - First-generation college student',
        '8': '8 - Strong diversity factors',
        '6': '6 - Some diversity factors',
        '4': '4 - Basic diversity factors',
        '2': '2 - No significant diversity factors'
      },
      hs_reputation: {
        '10': '10 - Highly prestigious high school',
        '8': '8 - Strong high school reputation',
        '6': '6 - Good high school reputation',
        '4': '4 - Average high school',
        '2': '2 - Weak high school reputation'
      }
    }

    const descriptions = factorDescriptions[factor] || {}
    return [
      { value: '10', label: descriptions['10'] || '10' },
      { value: '8', label: descriptions['8'] || '8' },
      { value: '6', label: descriptions['6'] || '6' },
      { value: '4', label: descriptions['4'] || '4' },
      { value: '2', label: descriptions['2'] || '2' },
    ]
  }

      const handleCalculateChances = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
          // Convert college ID to college name
          const selectedCollege = COLLEGES.find(college => college.value === profile.college)
          const collegeName = selectedCollege ? selectedCollege.label : profile.college

          const predictionData = {
            gpa_unweighted: parseFloat(profile.gpa_unweighted) || 0,
            gpa_weighted: parseFloat(profile.gpa_weighted) || 0,
            sat: parseInt(profile.sat) || 0,
            act: parseInt(profile.act) || 0,
            rigor: parseInt(profile.rigor),
            extracurricular_depth: parseInt(profile.extracurricular_depth),
            leadership_positions: parseInt(profile.leadership_positions),
            awards_publications: parseInt(profile.awards_publications),
            passion_projects: parseInt(profile.passion_projects),
            business_ventures: parseInt(profile.business_ventures),
            volunteer_work: parseInt(profile.volunteer_work),
            research_experience: parseInt(profile.research_experience),
            portfolio_audition: parseInt(profile.portfolio_audition),
            essay_quality: parseInt(profile.essay_quality),
            recommendations: parseInt(profile.recommendations),
            interview: parseInt(profile.interview),
            demonstrated_interest: parseInt(profile.demonstrated_interest),
            legacy_status: parseInt(profile.legacy_status),
            geographic_diversity: parseInt(profile.geographic_diversity),
            firstgen_diversity: parseInt(profile.firstgen_diversity),
            major: profile.major,
            hs_reputation: parseInt(profile.hs_reputation),
            college: collegeName, // Send college name instead of ID
          }

      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      })

      if (!response.ok) {
        throw new Error('Failed to get prediction')
      }

      const result = await response.json()

          const params = new URLSearchParams({
            probability: result.probability.toString(),
            outcome: result.outcome,
            college: collegeName, // Pass college name instead of ID
            realAcceptanceRate: result.acceptance_rate?.toString() || '0',
            // Pass user profile data as JSON string
            profile: JSON.stringify(profile)
          })

      router.push(`/results?${params.toString()}`)

    } catch (error) {
      console.error('Error calculating chances:', error)
      alert('Failed to calculate chances. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-xl border border-white/10 bg-yellow-400/15 text-yellow-400 shadow-[0_0_40px_rgba(245,200,75,0.15)]">
          {icon}
        </div>
      <div>
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>
  )

  const FormFieldWithInfo = ({ label, factor, children }:{ label: string; factor: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs md:text-sm font-semibold text-gray-300">{label}</label>
        <InfoIcon onClick={() => openInfoModal(factor)} />
      </div>
      {children}
    </div>
  )

  const enter = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring' as const, stiffness: 120, damping: 20, mass: 0.6 },
    viewport: { once: true, margin: '-10% 0px -10% 0px' }
  }

  const insightStatusClasses: Record<AutoFillInsightStatus, string> = {
    applied: 'bg-green-500/15 text-green-200 border border-green-500/30',
    pending: 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/30',
    kept: 'bg-sky-500/15 text-sky-200 border border-sky-500/30',
    info: 'bg-white/5 text-gray-200 border border-white/10',
    skipped: 'bg-red-500/15 text-red-200 border border-red-500/30'
  }

  const insightStatusLabels: Record<AutoFillInsightStatus, string> = {
    applied: 'Applied',
    pending: 'Pending',
    kept: 'Kept',
    info: 'Info',
    skipped: 'Skipped'
  }

  return (
    <div className="rox-container">
      <div className="rox-section">
        {/* Header */}
        <motion.div {...enter} className="text-center mb-8 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white mb-6 backdrop-blur-sm">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">AI Assessment</span>
          </div>
          <h1 className="rox-heading-1 mb-6 text-white">
            Chancify AI
        </h1>
          <p className="rox-text-large max-w-3xl mx-auto">
            The only AI that considers your unique story — not just numbers
          </p>
        </motion.div>

        {/* Application Import */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="rox-heading-3">Application Import</h2>
                <p className="rox-text-muted">
                  Drop in your Common App, resume, or activities list (.pdf or .docx) and we’ll auto-fill what we can.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  We will never use or share your confidential information.
                </p>
              </div>
            </div>

            <div
              className={`mt-6 border-2 border-dashed rounded-2xl px-4 py-10 text-center cursor-pointer transition-all duration-200 ${
                isDraggingFile ? 'border-yellow-400 bg-yellow-400/5' : 'border-white/15 bg-white/5'
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDraggingFile(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setIsDraggingFile(false)
              }}
              onDrop={(event) => handleFileDrop(event)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => handleFileInputChange(event)}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-white/10 text-yellow-300 border border-white/10">
                  {isParsingFile ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm sm:text-base text-white">
                    Drag & drop your application file or{' '}
                    <span className="text-yellow-300 underline">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Supported formats: PDF, Word (.docx)</p>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                {uploadError}
              </div>
            )}

            {uploadMessage && !uploadError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-300">
                {uploadMessage}
              </div>
            )}

            {lastUploadedFile && (
              <p className="mt-3 text-xs text-gray-400">
                Last import: <span className="text-white">{lastUploadedFile}</span>
              </p>
            )}

            {autoFillInsights.length > 0 && (
              <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide">Auto-fill Insights</h3>
                    <p className="text-xs text-gray-400">
                      How we mapped your application details to Chancify inputs
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-300">
                    {(['applied', 'pending', 'kept', 'info', 'skipped'] as AutoFillInsightStatus[]).map(status => (
                      <span
                        key={status}
                        className={`px-2 py-1 rounded-full ${insightStatusClasses[status]}`}
                      >
                        {insightStatusLabels[status]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-white/10">
                        <th className="px-4 py-3 font-medium">Field</th>
                        <th className="px-4 py-3 font-medium">Detected Detail</th>
                        <th className="px-4 py-3 font-medium">Mapped Value</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoFillInsights.map((insight, index) => (
                        <tr
                          key={`${insight.label}-${index}`}
                          className="border-b border-white/5 last:border-none"
                        >
                          <td className="px-4 py-3 text-white font-medium">{insight.label}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {insight.rawValue}
                            {insight.reason && (
                              <span className="block text-xs text-gray-500 mt-1">
                                {insight.reason}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-200">
                            {insight.mappedValue ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${insightStatusClasses[insight.status]}`}>
                              {insightStatusLabels[insight.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {SHOW_PARSE_DEBUG_PANEL && parseDiagnostics.length > 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Parser Debug</p>
                    <p className="text-xs text-gray-400">
                      Internal log of how the parser interpreted your upload.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowParseDebugger(prev => !prev)}
                    className="px-3 py-2 text-xs rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 transition"
                  >
                    {showParseDebugger ? 'Hide details' : 'Show details'}
                  </button>
                </div>
                {showParseDebugger && (
                  <div className="mt-3 max-h-48 overflow-y-auto space-y-3 text-xs">
                    {parseDiagnostics.map((diag, index) => (
                      <div
                        key={`${diag.phase}-${index}-${diag.message}`}
                        className="rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div className="text-[10px] uppercase tracking-wide text-yellow-300">
                          {diag.phase}
                        </div>
                        <div className="text-gray-100">{diag.message}</div>
                        {diag.details && (
                          <div className="text-[11px] text-gray-500 mt-1">{diag.details}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.section>

        {/* Academic Foundation */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <GraduationCap className="w-5 h-5" />
        </div>
              <h2 className="rox-heading-3">Academic Foundation</h2>
      </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Input
              label="Unweighted GPA (4.0)"
            type="number"
            step="0.01"
            min="0"
            max="4"
            placeholder="3.85"
            value={profile.gpa_unweighted}
            onChange={(e) => updateProfile('gpa_unweighted', e.target.value)}
            helperText="GPA without honors/AP weighting"
            badgeText={autoFilledFields.has('gpa_unweighted') ? 'Auto-filled' : undefined}
          />
          <Input
              label="Weighted GPA (5.0)"
            type="number"
            step="0.01"
            min="0"
            max="5"
            placeholder="4.25"
            value={profile.gpa_weighted}
            onChange={(e) => updateProfile('gpa_weighted', e.target.value)}
            helperText="GPA with honors/AP weighting"
            badgeText={autoFilledFields.has('gpa_weighted') ? 'Auto-filled' : undefined}
          />
          <Input
            label="SAT Score"
            type="number"
            min="400"
            max="1600"
            placeholder="1450"
            value={profile.sat}
            onChange={(e) => updateProfile('sat', e.target.value)}
            helperText="Total SAT score (optional)"
            badgeText={autoFilledFields.has('sat') ? 'Auto-filled' : undefined}
          />
          <Input
            label="ACT Score"
            type="number"
            min="1"
            max="36"
            placeholder="32"
            value={profile.act}
            onChange={(e) => updateProfile('act', e.target.value)}
            helperText="ACT composite (optional)"
            badgeText={autoFilledFields.has('act') ? 'Auto-filled' : undefined}
          />
          </div>
        </div>
      </motion.section>

        {/* Course Rigor and Class Info */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <Star className="w-5 h-5" />
              </div>
              <h2 className="rox-heading-3">Course Rigor & Class Info</h2>
        </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Input
              label="AP Courses Taken"
              type="number"
              min="0"
              max="20"
              placeholder="5"
              value={profile.ap_count}
              onChange={(e) => updateProfile('ap_count', e.target.value)}
              helperText="Number of AP courses completed"
              badgeText={autoFilledFields.has('ap_count') ? 'Auto-filled' : undefined}
            />
            <Input
              label="Honors Courses"
              type="number"
              min="0"
              max="20"
              placeholder="8"
              value={profile.honors_count}
              onChange={(e) => updateProfile('honors_count', e.target.value)}
              helperText="Number of honors courses"
              badgeText={autoFilledFields.has('honors_count') ? 'Auto-filled' : undefined}
            />
            <Input
              label="Class Rank %"
              type="number"
              min="1"
              max="100"
              placeholder="15"
              value={profile.class_rank_percentile}
              onChange={(e) => updateProfile('class_rank_percentile', e.target.value)}
              helperText="Your percentile rank (1-100)"
              badgeText={autoFilledFields.has('class_rank_percentile') ? 'Auto-filled' : undefined}
            />
            <Input
              label="Class Size"
              type="number"
              min="1"
              max="2000"
              placeholder="300"
              value={profile.class_size}
              onChange={(e) => updateProfile('class_size', e.target.value)}
              helperText="Total students in your graduating class"
              badgeText={autoFilledFields.has('class_size') ? 'Auto-filled' : undefined}
            />
          </div>
        </div>
      </motion.section>

        {/* Your Unique Story */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h2 className="rox-heading-3">Your Unique Story</h2>
                <p className="rox-text-muted">The holistic factors most other predictors ignore.</p>
              </div>
            </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              ['Extracurricular Depth', 'extracurricular_depth'],
              ['Leadership Positions', 'leadership_positions'],
              ['Awards & Publications', 'awards_publications'],
              ['Passion Projects', 'passion_projects'],
              ['Business Ventures', 'business_ventures'],
              ['Volunteer Work', 'volunteer_work'],
              ['Research Experience', 'research_experience'],
              ['Portfolio/Audition', 'portfolio_audition'],
              ['Essay Quality', 'essay_quality'],
              ['Recommendations', 'recommendations'],
              ['Interview', 'interview'],
              ['Demonstrated Interest', 'demonstrated_interest'],
              ['Legacy Status', 'legacy_status'],
              ['Geographic Diversity', 'geographic_diversity'],
              ['First-Gen/Diversity', 'firstgen_diversity'],
            ].map(([label, key]) => (
              <FormFieldWithInfo key={key} label={label} factor={key}>
                <ROXSelect
                  value={(profile as any)[key]}
                  onChange={(v) => updateProfile(key as keyof Profile, v as string)}
                  options={getFactorOptions(key)}
                />
              </FormFieldWithInfo>
            ))}


            {/* High School Reputation */}
            <FormFieldWithInfo label="High School Reputation" factor="hs_reputation">
              <ROXSelect
            value={profile.hs_reputation}
                onChange={(v) => updateProfile('hs_reputation', v)}
                options={getFactorOptions('hs_reputation')}
              />
            </FormFieldWithInfo>
          </div>
        </div>
      </motion.section>

        {/* Miscellaneous Notes */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h2 className="rox-heading-3">MISC</h2>
                <p className="rox-text-muted">Auto-captured notes and any extra highlights that don’t fit elsewhere.</p>
              </div>
            </div>

            {!hasMiscEntries ? (
              <p className="text-sm text-gray-400">
                No misc notes yet. Upload an application above or add anything noteworthy manually.
              </p>
            ) : (
              <div className="space-y-6">
                {MISC_CATEGORY_SEQUENCE.map(category => {
                  const entries = miscGroups[category]
                  if (!entries.length) return null
                  const meta = MISC_CATEGORY_META[category]
                  return (
                    <div key={category}>
                      <div className={`text-xs font-semibold uppercase tracking-wide ${meta.accent}`}>
                        {meta.label}
                      </div>
                      <ul className="mt-3 space-y-3">
                        {entries.map((item, index) => (
                          <li
                            key={`${category}-${item}-${index}`}
                            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                          >
                            <span className={`${meta.bullet} mt-1`}>•</span>
                            <div className="flex-1 text-sm text-white">{item}</div>
                            <button
                              onClick={() => {
                                const next = [...profile.misc]
                                const removeIndex = next.indexOf(item)
                                if (removeIndex !== -1) {
                                  next.splice(removeIndex, 1)
                                  updateProfile('misc', next)
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-300 transition"
                              aria-label="Remove misc item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={miscInput}
                onChange={(event) => setMiscInput(event.target.value)}
                placeholder="Add a custom note (e.g., Summer internship at NASA)"
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
              <button
                onClick={() => {
                  if (!miscInput.trim()) return
                  const value = miscInput.trim()
                  if (profile.misc.some(item => item.toLowerCase() === value.toLowerCase())) {
                    setMiscInput('')
                    return
                  }
                  updateProfile('misc', [...profile.misc, value])
                  setMiscInput('')
                }}
                className="rox-button-secondary px-4 py-3 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Note</span>
              </button>
          </div>
        </div>
      </motion.section>

        {/* Intended Major */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-yellow-400/20 text-yellow-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="rox-heading-3">Intended Major</h2>
                <p className="rox-text-muted">Select your field of study</p>
              </div>
            </div>

            <button
              onClick={handleOpenMajorModal}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-left flex items-center justify-between hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
            >
              <span className={profile.major ? 'text-white' : 'text-gray-400'}>
                {profile.major || 'Choose your major...'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
        </div>
      </motion.section>

        {/* Action Buttons */}
        <motion.section {...enter} className="mb-8 sm:mb-10 lg:mb-12">
          <div className="rox-card p-4 sm:p-6 lg:p-8">
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="rox-heading-3">
                  {isProfileComplete() ? 'Ready to Explore?' : 'Complete Your Profile'}
                </h2>
                    <p className="rox-text-body">
                      {isProfileComplete()
                        ? 'Your profile is complete. Let\'s discover colleges that match your unique story.'
                        : 'Please fill in your GPA information to continue to college discovery.'
                      }
                    </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="rox-button-secondary text-lg px-8 py-4 flex items-center gap-3"
                >
                  <span>Save</span>
                </button>

                <button
                  onClick={() => router.push('/college-selection')}
                  disabled={!isProfileComplete()}
                  className={`text-lg px-8 py-4 flex items-center gap-3 transition-all duration-200 ${
                    isProfileComplete()
                      ? 'rox-button-primary'
                      : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

                  {!isProfileComplete() && (
                    <p className="rox-text-muted mt-4">
                      Required: Unweighted GPA and Weighted GPA
                    </p>
                  )}
      </div>
        </div>
      </motion.section>

      {/* Info Modal */}
      <InfoModal
        isOpen={modalInfo.isOpen}
        onClose={closeInfoModal}
        title={modalInfo.factor ? FACTOR_DESCRIPTIONS[modalInfo.factor as keyof typeof FACTOR_DESCRIPTIONS]?.title || '' : ''}
        description={modalInfo.factor ? FACTOR_DESCRIPTIONS[modalInfo.factor as keyof typeof FACTOR_DESCRIPTIONS]?.description || '' : ''}
        examples={modalInfo.factor ? FACTOR_DESCRIPTIONS[modalInfo.factor as keyof typeof FACTOR_DESCRIPTIONS]?.examples || [] : []}
      />

        {/* Major Selection Modal */}
        <MajorSelectionModal
          isOpen={isMajorModalOpen}
          onClose={handleCloseMajorModal}
          selectedMajor={profile.major}
          onSelectMajor={handleSelectMajor}
        />

        {/* Save Modal */}
        <SaveModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSavePreset}
        />

        {/* Saved Toast */}
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg"
          >
            Saved!
          </motion.div>
        )}

        <AnimatePresence>
          {isOverrideModalOpen && pendingOverrides && (
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6"
          >
            {/* Enhanced blurred backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={skipOverrides}
            />

            {/* Modal content with smooth animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f0f15] to-[#08080b] border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-transparent pointer-events-none" />

              <div className="relative p-6 sm:p-8">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-4 mb-6"
                >
                  <div className="p-3 bg-gradient-to-br from-yellow-400/20 to-yellow-500/10 text-yellow-300 rounded-2xl border border-yellow-400/30 shadow-lg shadow-yellow-400/10">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Override Existing Values?</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      We found application details that differ from your current entries. Choose which values you'd like to keep.
                    </p>
                  </div>
                </motion.div>

                {/* Summary bar */}
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-gray-300">
                      <span className="font-semibold text-white">{selectedOverrideCount}</span> of{' '}
                      <span className="font-semibold text-white">{pendingOverrideFields.length}</span>{' '}
                      {pendingOverrideFields.length === 1 ? 'field' : 'fields'} selected
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAllOverrideSelections(false)}
                        className="px-4 py-2 rounded-xl border border-white/20 bg-white/5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:border-white/30 transition-all"
                      >
                        Keep All
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAllOverrideSelections(true)}
                        className="px-4 py-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-xs font-medium text-yellow-200 hover:bg-yellow-400/20 hover:border-yellow-400/60 transition-all"
                      >
                        Use All
                      </motion.button>
                    </div>
                  </div>
                </motion.div>

                {/* Fields list */}
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 mb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                  {pendingOverrideFields.map((field, index) => {
                    const useApplication = overrideSelections[field] ?? true
                    return (
                      <motion.div
                        key={field}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 backdrop-blur-sm hover:border-white/20 transition-all"
                      >
                        <div className="mb-4">
                          <div className="text-white font-semibold text-sm mb-3">
                            {FIELD_LABELS[field] || field}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <span className="text-gray-400">Current:</span>
                              <span className="text-white font-medium">
                                {typeof profile[field] === 'string' && profile[field] ? profile[field] : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-yellow-400" />
                              <span className="text-gray-400">Application:</span>
                              <span className="text-white font-medium">
                                {pendingOverrides[field] ?? '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleOverrideSelection(field, false)}
                            className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
                              !useApplication
                                ? 'border-white/40 bg-white/15 text-white shadow-lg shadow-white/10'
                                : 'border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                            }`}
                          >
                            Keep Current
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleOverrideSelection(field, true)}
                            className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
                              useApplication
                                ? 'border-yellow-400/50 bg-yellow-400/20 text-yellow-100 shadow-lg shadow-yellow-400/20'
                                : 'border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
                            }`}
                          >
                            Use Application
                          </motion.button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Footer actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-white/10"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={skipOverrides}
                    className="px-6 py-3 rounded-xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/30 transition-all font-medium sm:flex-1"
                  >
                    Cancel
                  </motion.button>
                  <div className="flex flex-col gap-3 sm:flex-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={applyAllOverrides}
                      className="px-6 py-3 rounded-xl border border-yellow-400/40 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20 hover:border-yellow-400/60 transition-all font-medium"
                    >
                      Apply All ({pendingOverrideFields.length})
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: selectedOverrideCount ? 1.02 : 1 }}
                      whileTap={{ scale: selectedOverrideCount ? 0.98 : 1 }}
                      onClick={applySelectedOverrides}
                      disabled={!selectedOverrideCount}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        selectedOverrideCount
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400 shadow-lg shadow-yellow-400/30'
                          : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                      }`}
                    >
                      Apply Selected ({selectedOverrideCount})
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx']

type AutoFillInsightStatus = 'applied' | 'pending' | 'kept' | 'info' | 'skipped'

type AutoFillInsight = ApplicationMetric & {
  status: AutoFillInsightStatus
}

const isSupportedFileType = (file: File) => {
  const lowerName = file.name.toLowerCase()
  return SUPPORTED_MIME_TYPES.has(file.type) || SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
}

const extractTextFromFile = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer()
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith('.pdf')) {
    return extractPdfText(arrayBuffer)
  }

  if (lowerName.endsWith('.docx')) {
    return extractDocxText(arrayBuffer)
  }

  throw new Error('Unsupported file type')
}

const extractPdfText = async (arrayBuffer: ArrayBuffer) => {
  // Dynamic import for pdfjs-dist (v4.x structure)
  const pdfjsLib = await import('pdfjs-dist')

  // Set up worker for browser environment
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Get the actual installed version from the library
    const version = pdfjsLib.version || '4.10.38'

    // Use jsdelivr CDN which is reliable and supports version ranges
    // For v4.x, the worker is typically at build/pdf.worker.min.mjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
  }

  // Try parsing with worker first, fallback to main thread if worker fails
  const parsePdf = async (disableWorker = false) => {
    const options: any = {
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: !disableWorker,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0 // Reduce console noise
    }

    // If worker is disabled, don't set workerSrc
    if (disableWorker && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    }

    const pdf = await pdfjsLib.getDocument(options).promise

    let text = ''
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const strings = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ')
      text += strings + '\n'
    }
    return text
  }

  try {
    // Try with worker first
    return await parsePdf(false)
  } catch (error) {
    // If worker fails, try without worker (main thread - slower but more reliable)
    if (error instanceof Error && (error.message.includes('worker') || error.message.includes('Failed to fetch'))) {
      console.warn('PDF worker failed, falling back to main thread parsing')
      try {
        return await parsePdf(true)
      } catch (fallbackError) {
        console.error('PDF parsing error (fallback):', fallbackError)
        if (fallbackError instanceof Error) {
          if (fallbackError.message.includes('password') || fallbackError.message.includes('encrypted')) {
            throw new Error('This PDF is password protected. Please remove the password and try again.')
          }
          throw new Error(`Failed to parse PDF: ${fallbackError.message}`)
        }
        throw new Error('Failed to parse PDF: Unknown error')
      }
    }

    // Handle other errors
    console.error('PDF parsing error:', error)
    if (error instanceof Error) {
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        throw new Error('This PDF is password protected. Please remove the password and try again.')
      }
      throw new Error(`Failed to parse PDF: ${error.message}`)
    }
    throw new Error('Failed to parse PDF: Unknown error')
  }
}

const extractDocxText = async (arrayBuffer: ArrayBuffer) => {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return value || ''
}
