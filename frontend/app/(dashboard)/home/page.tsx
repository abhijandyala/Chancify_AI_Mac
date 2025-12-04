'use client'

import { Input } from '@/components/ui/Input'
import { ROXSelect } from '@/components/ui/ROXSelect'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { InfoModal } from '@/components/ui/InfoModal'
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { COLLEGES } from '@/lib/colleges'
import { FACTOR_DESCRIPTIONS } from '@/lib/factorDescriptions'
import { motion } from 'framer-motion'
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
  const [miscInput, setMiscInput] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    try {
      const text = await extractTextFromFile(file)
      if (!text || !text.trim()) {
        setUploadMessage('Unable to extract readable text from that file.')
        return
      }

      const parsed = parseApplicationData(text)
      const filteredUpdates: Partial<Profile> = {}

      ;(Object.entries(parsed.updates) as [keyof Profile, Profile[keyof Profile]][]).forEach(([key, value]) => {
        // Skip misc field (it's handled separately) and ensure value is a string
        if (key === 'misc' || typeof value !== 'string') return
        const currentValue = profile[key]
        if (typeof currentValue === 'string' && !currentValue.trim()) {
          ;(filteredUpdates as any)[key] = value
        }
      })

      let miscAdded = 0
      if (parsed.misc.length) {
        const uniqueMisc = parsed.misc.filter(item => {
          const normalized = item.toLowerCase()
          return item.length >= 6 && !profile.misc.some(existing => existing.toLowerCase() === normalized)
        })
        if (uniqueMisc.length) {
          updateProfile('misc', [...profile.misc, ...uniqueMisc])
          miscAdded = uniqueMisc.length
        }
      }

      if (Object.keys(filteredUpdates).length) {
        updateProfileBulk(filteredUpdates, { autoFilled: true })
      }

      setLastUploadedFile(file.name)

      if (Object.keys(filteredUpdates).length || miscAdded) {
        const filledLabels = Object.keys(filteredUpdates).map(
          key => FIELD_LABELS[key as keyof typeof FIELD_LABELS] || key
        )
        const messages: string[] = []
        if (filledLabels.length) {
          messages.push(`Auto-filled ${filledLabels.join(', ')}`)
        }
        if (miscAdded) {
          messages.push(`Captured ${miscAdded} misc note${miscAdded > 1 ? 's' : ''}`)
        }
        setUploadMessage(messages.join('. '))
      } else {
        setUploadMessage('No new structured info detected. You can still add notes manually.')
      }
    } catch (error) {
      console.error('Failed to process application file', error)
      setUploadError('Failed to process file. Please ensure it is not password protected.')
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

            {profile.misc.length === 0 ? (
              <p className="text-sm text-gray-400">
                No misc notes yet. Upload an application above or add anything noteworthy manually.
              </p>
            ) : (
              <ul className="space-y-3">
                {profile.misc.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"
                  >
                    <span className="text-yellow-300 mt-1">•</span>
                    <div className="flex-1 text-sm text-white">{item}</div>
                    <button
                      onClick={() => {
                        const next = profile.misc.filter((_, i) => i !== index)
                        updateProfile('misc', next)
                      }}
                      className="p-1 text-gray-400 hover:text-red-300 transition"
                      aria-label="Remove misc item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
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
      </div>
    </div>
  )
}

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx']

const FIELD_LABELS: Partial<Record<keyof Profile, string>> = {
  gpa_unweighted: 'Unweighted GPA',
  gpa_weighted: 'Weighted GPA',
  sat: 'SAT Score',
  act: 'ACT Score',
  ap_count: 'AP Courses',
  honors_count: 'Honors Courses',
  class_rank_percentile: 'Class Rank %',
  class_size: 'Class Size'
}

type ParsedApplicationData = {
  updates: Partial<Profile>
  misc: string[]
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
    // Use CDN worker for browser builds
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.2.67'}/pdf.worker.min.js`
  }

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ')
    text += strings + '\n'
  }
  return text
}

const extractDocxText = async (arrayBuffer: ArrayBuffer) => {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return value || ''
}

const parseApplicationData = (rawText: string): ParsedApplicationData => {
  const text = rawText.replace(/\r/g, '\n')
  const updates: Partial<Profile> = {}

  const matchNumber = (regex: RegExp) => {
    const match = text.match(regex)
    return match ? match[1] : undefined
  }

  const weightedGpa = matchNumber(/weighted\s*gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
  if (weightedGpa) {
    updates.gpa_weighted = weightedGpa
  }

  const unweightedGpa = matchNumber(/unweighted\s*gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
  if (unweightedGpa) {
    updates.gpa_unweighted = unweightedGpa
  } else if (!updates.gpa_unweighted) {
    const generalGpa = matchNumber(/gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
    if (generalGpa) {
      updates.gpa_unweighted = generalGpa
    }
  }

  const satScore = matchNumber(/sat[^0-9]{0,12}(\d{3,4})/i)
  if (satScore) {
    updates.sat = satScore
  }

  const actScore = matchNumber(/act[^0-9]{0,12}(\d{1,2})/i)
  if (actScore) {
    updates.act = actScore
  }

  const apCourses = matchNumber(/(?:ap|advanced placement)[^0-9]{0,12}(\d{1,2})/i)
  if (apCourses) {
    updates.ap_count = apCourses
  }

  const honorsCourses = matchNumber(/honors (?:courses|classes)[^0-9]{0,12}(\d{1,2})/i)
  if (honorsCourses) {
    updates.honors_count = honorsCourses
  }

  const classRank = matchNumber(/class rank[^0-9%]{0,12}(\d{1,2})\s*%/i)
  if (classRank) {
    updates.class_rank_percentile = classRank
  }

  const classSize =
    matchNumber(/(?:class size|class of|students in (?:my )?class)[^0-9]{0,12}(\d{2,4})/i) ||
    matchNumber(/cohort of (\d{2,4})/i)
  if (classSize) {
    updates.class_size = classSize
  }

  return {
    updates,
    misc: extractMiscCandidates(text)
  }
}

const extractMiscCandidates = (text: string) => {
  const keywords = [
    'internship',
    'research',
    'startup',
    'nonprofit',
    'publication',
    'robotics',
    'volunteer',
    'leadership',
    'award',
    'scholarship',
    'project',
    'hackathon',
    'founded'
  ]

  const candidates = text
    .split(/[\n\.]+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const unique = new Set<string>()
  const results: string[] = []

  candidates.forEach(line => {
    const lower = line.toLowerCase()
    if (line.length < 12 || line.length > 220) return
    if (keywords.some(keyword => lower.includes(keyword))) {
      const normalized = line.charAt(0).toUpperCase() + line.slice(1)
      if (!unique.has(normalized.toLowerCase())) {
        unique.add(normalized.toLowerCase())
        results.push(normalized)
      }
    }
  })

  return results.slice(0, 10)
}
