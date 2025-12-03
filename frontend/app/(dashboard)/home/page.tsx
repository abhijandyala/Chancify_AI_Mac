'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/Input'
import { ROXSelect } from '@/components/ui/ROXSelect'
import { MajorAutocomplete } from '@/components/ui/MajorAutocomplete'
import { InfoIcon } from '@/components/ui/InfoIcon'
import { InfoModal } from '@/components/ui/InfoModal'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import { COLLEGES } from '@/lib/colleges'
import { FACTOR_DESCRIPTIONS } from '@/lib/factorDescriptions'
import { motion } from 'framer-motion'
import { GraduationCap, Star, Building2, Calculator, Brain, Zap, Target, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MajorSelectionModal } from '@/components/ui/MajorSelectionModal'
import { SaveModal } from '@/components/SaveModal'
import { PresetStorage } from '@/lib/preset-storage'

export const dynamic = 'force-dynamic'

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
  
  const [profile, setProfile] = useState({
    // Academic metrics
    gpa_unweighted: '3.85',
    gpa_weighted: '4.25',
    sat: '1450',
    act: '32',
    
    // Course rigor and class info
    rigor: '5',
    ap_count: '5',
    honors_count: '8',
    class_rank_percentile: '15',
    class_size: '300',
    
    // Extracurriculars and activities
    extracurricular_depth: '5',
    leadership_positions: '5',
    awards_publications: '5',
    passion_projects: '5',
    business_ventures: '5',
    volunteer_work: '5',
    research_experience: '5',
    portfolio_audition: '5',
    
    // Application quality
    essay_quality: '5',
    recommendations: '5',
    interview: '5',
    demonstrated_interest: '5',
    
    // Context factors
    legacy_status: '5',
    hs_reputation: '5',
    major: '',
    college: '',
    
    // Additional ML model fields (kept only those used in dropdowns)
    geographic_diversity: '5',
    plan_timing: '5',
    geography_residency: '5',
    firstgen_diversity: '5',
    ability_to_pay: '5',
    policy_knob: '5',
    conduct_record: '9'
  })

  const updateProfile = (field: string, value: string) => {
    setProfile(prev => {
      const updatedProfile = { ...prev, [field]: value }
      // Save to localStorage for college selection page
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile))
      // Dispatch custom event to notify college selection page
      window.dispatchEvent(new CustomEvent('profileUpdated'))
      return updatedProfile
    })
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
        setProfile(preset.formData)
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
    const requiredFields = ['gpa_unweighted', 'gpa_weighted']
    return requiredFields.every(field => profile[field as keyof typeof profile] && profile[field as keyof typeof profile].trim() !== '')
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
                  onChange={(v) => updateProfile(key, v)} 
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
