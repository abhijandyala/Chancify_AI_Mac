'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Building2, Users, DollarSign, GraduationCap, ChevronRight, Star, MapPin, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { getCollegeSuggestions, searchColleges, type CollegeSuggestionsRequest, type CollegeSuggestion, type CollegeSearchResult } from '@/lib/api'
import Loader from '@/components/Loader'
import { useTuitionByZipcode } from '@/lib/hooks/useTuitionByZipcode'
import { useMultipleTuitionByZipcode } from '@/lib/hooks/useMultipleTuitionByZipcode'

// Function to get tuition info with in-state/out-of-state status
const getTuitionInfoForZipcode = (college: any, zipcode: string, tuitionData: any = null) => {
  if (!zipcode || zipcode.length < 5) {
    return {
      tuition: college.tuition_in_state || college.tuition_out_state || 'N/A',
      isInState: null,
      state: null
    }
  }
  
  // Use API data if available
  if (tuitionData && tuitionData.success) {
    return {
      tuition: tuitionData.tuition,
      isInState: tuitionData.is_in_state,
      state: tuitionData.zipcode_state,
      city: tuitionData.zipcode_city
    }
  }
  
  // Fallback to local logic
  const zipcodeState = getStateFromZipcode(zipcode)
  const collegeState = college.state
  
  const isInState = zipcodeState === collegeState
  
  return {
    tuition: isInState 
      ? (college.tuition_in_state || college.tuition_out_state || 'N/A')
      : (college.tuition_out_state || college.tuition_in_state || 'N/A'),
    isInState,
    state: zipcodeState
  }
}

// Function to get state from zipcode (simplified)
const getStateFromZipcode = (zipcode: string) => {
  const prefix = zipcode.substring(0, 2)
  const stateMap: { [key: string]: string } = {
    '15': 'PA', '16': 'PA', '17': 'PA', '18': 'PA',
    '90': 'CA', '91': 'CA', '92': 'CA', '93': 'CA', '94': 'CA', '95': 'CA',
    '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
    '75': 'TX', '76': 'TX', '77': 'TX', '78': 'TX', '79': 'TX',
    '60': 'IL', '61': 'IL', '62': 'IL',
    '43': 'OH', '44': 'OH', '45': 'OH',
    '48': 'MI', '49': 'MI',
    '55': 'MN', '56': 'MN',
    '63': 'MO', '64': 'MO', '65': 'MO',
    '30': 'GA', '31': 'GA',
    '32': 'FL', '33': 'FL', '34': 'FL',
    '27': 'NC', '28': 'NC',
    '22': 'VA', '23': 'VA', '24': 'VA',
    '40': 'KY', '41': 'KY', '42': 'KY',
    '46': 'IN', '47': 'IN',
    '50': 'IA', '51': 'IA',
    '66': 'KS', '67': 'KS',
    '70': 'LA', '71': 'LA',
    '03': 'ME', '04': 'ME',
    '20': 'MD', '21': 'MD',
    '01': 'MA', '02': 'MA',
    '38': 'MS', '39': 'MS',
    '59': 'MT',
    '68': 'NE', '69': 'NE',
    '89': 'NV',
    '07': 'NJ', '08': 'NJ',
    '87': 'NM', '88': 'NM',
    '58': 'ND',
    '73': 'OK', '74': 'OK',
    '97': 'OR',
    '29': 'SC',
    '57': 'SD',
    '37': 'TN',
    '84': 'UT',
    '05': 'VT',
    '98': 'WA',
    '25': 'WV', '26': 'WV',
    '53': 'WI', '54': 'WI',
    '82': 'WY',
    '35': 'AL', '36': 'AL',
    '99': 'AK',
    '85': 'AZ', '86': 'AZ',
    '80': 'CO', '81': 'CO',
    '06': 'CT',
    '19': 'DE',
    '96': 'HI',
    '83': 'ID',
    '72': 'AR'
  }
}

// Function to get major relevance information for a college
// This uses the major_fit_score and major_match from the backend data
const getMajorRelevanceInfo = (college: any) => {
  const majorFitScore = college.major_fit_score || 0.3
  const matchText = college.major_match || 'Weak Match' // Use backend's match level
  
  // Determine isRelevant and isStrong based on match text
  const isStrong = matchText === 'Strong Match'
  const isRelevant = matchText === 'Good Match' || isStrong
  
  return { 
    strength: majorFitScore, 
    isRelevant, 
    isStrong,
    matchText
  }
}

export default function CollegeSelectionPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [selectedColleges, setSelectedColleges] = useState<string[]>([])
  const [suggestedColleges, setSuggestedColleges] = useState<CollegeSuggestion[]>([])
  const [searchResults, setSearchResults] = useState<CollegeSearchResult[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoader, setShowLoader] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Get user profile from localStorage
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Get tuition data for all colleges based on zipcode
  const allCollegeNames = [
    ...searchResults.map(college => college.name),
    ...suggestedColleges.map(college => college.name)
  ].filter((name, index, array) => array.indexOf(name) === index) // Remove duplicates
  
  const { tuitionDataMap, loading: zipcodeTuitionLoading, error: zipcodeTuitionError } = useMultipleTuitionByZipcode(
    allCollegeNames,
    zipcode
  )
  
  useEffect(() => {
    // Load user profile from localStorage
    const profileData = localStorage.getItem('userProfile')
    if (profileData) {
      try {
        setUserProfile(JSON.parse(profileData))
      } catch (error) {
        console.error('Error parsing user profile:', error)
        setUserProfile({ major: 'Computer Science' }) // Default fallback
      }
    } else {
      setUserProfile({ major: 'Computer Science' }) // Default fallback
    }
  }, [])

  // Search colleges using real data from backend
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsLoadingSearch(true)
      try {
        const response = await searchColleges(searchQuery, 20)
        if (response.success) {
          setSearchResults(response.colleges)
        } else {
          console.error('Search failed:', response.error)
          setSearchResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoadingSearch(false)
      }
    }

    const timeoutId = setTimeout(performSearch, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Get AI suggestions from real ML backend
  useEffect(() => {
    const loadAISuggestions = async () => {
      setIsLoadingSuggestions(true)
      setError(null)
      
      try {
        // Get user profile from localStorage
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
        
        // Create college suggestions request - only include fields that backend expects
        const collegeSuggestionsRequest: CollegeSuggestionsRequest = {
          gpa_unweighted: userProfile.gpa_unweighted || '3.5',
          gpa_weighted: userProfile.gpa_weighted || '3.8',
          sat: userProfile.sat || '1200',
          act: userProfile.act || '25',
          major: userProfile.major || 'Computer Science',
          extracurricular_depth: userProfile.extracurricular_depth || '5',
          leadership_positions: userProfile.leadership_positions || '5',
          awards_publications: userProfile.awards_publications || '5',
          passion_projects: userProfile.passion_projects || '5',
          business_ventures: userProfile.business_ventures || '5',
          volunteer_work: userProfile.volunteer_work || '5',
          research_experience: userProfile.research_experience || '5',
          portfolio_audition: userProfile.portfolio_audition || '5',
          essay_quality: userProfile.essay_quality || '5',
          recommendations: userProfile.recommendations || '5',
          interview: userProfile.interview || '5',
          demonstrated_interest: userProfile.demonstrated_interest || '5',
          legacy_status: userProfile.legacy_status || '5',
          hs_reputation: userProfile.hs_reputation || '5',
          geographic_diversity: userProfile.geographic_diversity || '5',
          plan_timing: userProfile.plan_timing || '5',
          geography_residency: userProfile.geography_residency || '5',
          firstgen_diversity: userProfile.firstgen_diversity || '5',
          ability_to_pay: userProfile.ability_to_pay || '5',
          policy_knob: userProfile.policy_knob || '5',
          conduct_record: userProfile.conduct_record || '5'
        }
        
        // Get AI suggestions from backend
        const response = await getCollegeSuggestions(collegeSuggestionsRequest)
        
        if (response.success) {
          setSuggestedColleges(response.suggestions)
        } else {
          setError(response.message || 'Failed to get AI suggestions')
        }
      } catch (err) {
        console.error('Error loading AI suggestions:', err)
        setError('Failed to load AI suggestions. Please try again.')
      } finally {
        setIsLoadingSuggestions(false)
      }
    }
    
    loadAISuggestions()
  }, [])

  // Listen for profile changes to regenerate suggestions
  useEffect(() => {
    const handleProfileChange = () => {
      // Reload suggestions when profile changes
      const loadAISuggestions = async () => {
        setIsLoadingSuggestions(true)
        setError(null)
        
        try {
          const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
          
          const collegeSuggestionsRequest: CollegeSuggestionsRequest = {
            gpa_unweighted: userProfile.gpa_unweighted || '3.5',
            gpa_weighted: userProfile.gpa_weighted || '3.8',
            sat: userProfile.sat || '1200',
            act: userProfile.act || '25',
            major: userProfile.major || 'Computer Science',
            extracurricular_depth: userProfile.extracurricular_depth || '5',
            leadership_positions: userProfile.leadership_positions || '5',
            awards_publications: userProfile.awards_publications || '5',
            passion_projects: userProfile.passion_projects || '5',
            business_ventures: userProfile.business_ventures || '5',
            volunteer_work: userProfile.volunteer_work || '5',
            research_experience: userProfile.research_experience || '5',
            portfolio_audition: userProfile.portfolio_audition || '5',
            essay_quality: userProfile.essay_quality || '5',
            recommendations: userProfile.recommendations || '5',
            interview: userProfile.interview || '5',
            demonstrated_interest: userProfile.demonstrated_interest || '5',
            legacy_status: userProfile.legacy_status || '5',
            hs_reputation: userProfile.hs_reputation || '5',
            geographic_diversity: userProfile.geographic_diversity || '5',
            plan_timing: userProfile.plan_timing || '5',
            geography_residency: userProfile.geography_residency || '5',
            firstgen_diversity: userProfile.firstgen_diversity || '5',
            ability_to_pay: userProfile.ability_to_pay || '5',
            policy_knob: userProfile.policy_knob || '5',
            conduct_record: userProfile.conduct_record || '5'
          }
          
          const response = await getCollegeSuggestions(collegeSuggestionsRequest)
          
          if (response.success) {
            setSuggestedColleges(response.suggestions)
          } else {
            setError(response.message || 'Failed to get AI suggestions')
          }
        } catch (err) {
          console.error('Error loading AI suggestions:', err)
          setError('Failed to load AI suggestions. Please try again.')
        } finally {
          setIsLoadingSuggestions(false)
        }
      }
      
      loadAISuggestions()
    }
    
    // Listen for storage changes and custom events
    window.addEventListener('storage', handleProfileChange)
    window.addEventListener('profileUpdated', handleProfileChange)
    
    return () => {
      window.removeEventListener('storage', handleProfileChange)
      window.removeEventListener('profileUpdated', handleProfileChange)
    }
  }, [])

  // Handle college selection (single selection only)
  const handleCollegeSelect = (collegeId: string) => {
    setSelectedColleges(prev =>
      prev.includes(collegeId)
        ? [] // Deselect if already selected
        : [collegeId] // Select only this college
    )
    
    // Store zipcode in localStorage for ML model
    if (zipcode) {
      localStorage.setItem('userZipcode', zipcode)
    }
  }

  // Auto-fill search box with college name
  const handleAutoFillSearch = (collegeName: string) => {
    console.log('Auto-filling search with:', collegeName)
    setSearchQuery(collegeName)
    console.log('Search query set to:', collegeName)
  }

  // Animation variants
  const enter = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  }

  const stagger = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div {...enter} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/15 text-primary">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">College Selection</h1>
            <p className="text-gray-400">AI-powered college recommendations and predictions</p>
          </div>
        </div>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div {...enter} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Search Section - Full Width */}
      <motion.div {...enter} className="mb-8">
        <div className="rox-card p-6 max-w-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Search Colleges</h2>
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for colleges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
            />
          </div>
          
          {/* Zipcode Input */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Zipcode (for in-state/out-of-state tuition)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter your zipcode (e.g., 15213)"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="w-full pl-10 pr-4 py-3 bg-transparent border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none"
                maxLength={5}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This helps determine if you qualify for in-state tuition rates
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Results - Full Width */}
      {searchQuery.length >= 2 && (
        <motion.div {...enter} className="mb-8">
          <div className="rox-card p-6 max-w-4xl">
            <h3 className="text-lg font-semibold text-white mb-4">Search Results</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isLoadingSearch ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                  <span className="ml-2 text-gray-400">Searching colleges...</span>
                </div>
              ) : searchResults.length > 0 ? (
                 searchResults.map((college) => (
                   <motion.div
                     key={college.college_id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                     onClick={() => handleCollegeSelect(college.college_id)}
                     className="college-card-wrapper"
                   >
                     <div className={`college-card-glow search ${selectedColleges.includes(college.college_id) ? 'active' : ''}`}></div>
                    <div className={`relative z-10 flex items-center justify-between p-2.5 md:p-3 border rounded-lg transition-all duration-300 cursor-pointer ${
                       selectedColleges.includes(college.college_id)
                         ? 'border-yellow-400/50'
                         : 'border-gray-600 hover:border-yellow-400/50'
                     }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-white font-medium">{college.name}</p>
                        <p className="text-gray-400 text-sm">
                          {college.selectivity_tier} • {(college.acceptance_rate * 100).toFixed(1)}% acceptance
                        </p>
                        <p className="text-gray-500 text-xs">
                          {college.city}, {college.state} • ${(() => {
                            const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                            return tuitionInfo.tuition?.toLocaleString() || 'N/A'
                          })()} tuition {zipcode && zipcode.length >= 5 && (() => {
                            const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                            if (tuitionInfo.isInState === true) {
                              return <span className="text-green-400">(In-State)</span>
                            } else if (tuitionInfo.isInState === false) {
                              return <span className="text-red-400">(Out-of-State)</span>
                            }
                            return null
                          })()}
                        </p>
                            {/* Major Relevance */}
                            <div className="mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Your Major:</span>
                                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30 font-medium">
                                  {userProfile.major || 'Computer Science'}
                                </span>
                                {(() => {
                                  const relevance = getMajorRelevanceInfo(college)
                                  return (
                                    <span className={`px-2 py-1 text-xs rounded-full border ${
                                      relevance.isStrong 
                                        ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                                        : relevance.isRelevant
                                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                        : 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                                    }`}>
                                      {relevance.matchText}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No colleges found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Recommendations - Full Width */}
      <motion.div {...enter} className="space-y-8">
          <div className="rox-card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">AI Recommendations</h2>
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                <span className="ml-3 text-gray-400">Loading AI suggestions...</span>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Safety Schools (75%+ chance) */}
                {suggestedColleges.filter(c => c.category === 'safety').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      Safety Schools (75%+ chance)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {suggestedColleges.filter(c => c.category === 'safety').map((college, index) => (
                         <motion.div
                           key={college.college_id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: index * 0.1 }}
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={() => handleCollegeSelect(college.college_id)}
                           className="college-card-wrapper"
                         >
                           <div className={`college-card-glow safety ${selectedColleges.includes(college.college_id) ? 'active' : ''}`}></div>
                           <div className={`p-6 border rounded-xl transition-all duration-300 cursor-pointer ${
                             selectedColleges.includes(college.college_id)
                               ? 'border-green-400/50'
                               : 'border-green-400/30 bg-green-400/5 hover:border-green-400/50'
                           }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-white font-semibold">{college.name}</h4>
                              <p className="text-gray-400 text-sm">{college.selectivity_tier}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
                                {(college.probability * 100).toFixed(1)}%
                              </div>
                              <div className="text-green-400 text-sm font-medium">
                                Safety
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Users className="w-4 h-4 text-green-400" />
                              <span>{(college.acceptance_rate * 100).toFixed(1)}% acceptance</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span>{college.city}, {college.state}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <DollarSign className="w-4 h-4 text-yellow-400" />
                              <span>${(() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                return tuitionInfo.tuition?.toLocaleString() || 'N/A'
                              })()} {zipcode && zipcode.length >= 5 && (() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                if (tuitionInfo.isInState === true) {
                                  return <span className="text-green-400 text-xs">(In-State)</span>
                                } else if (tuitionInfo.isInState === false) {
                                  return <span className="text-red-400 text-xs">(Out-of-State)</span>
                                }
                                return null
                              })()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Star className="w-4 h-4 text-green-400" />
                              <span>High confidence</span>
                            </div>
                          </div>
                          
                            {/* Major Relevance */}
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                                <BookOpen className="w-4 h-4" />
                                <span>Your Major Match:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30 font-medium">
                                  {userProfile.major || 'Computer Science'}
                                </span>
                                {(() => {
                                  const relevance = getMajorRelevanceInfo(college)
                                  return (
                                    <span className={`px-2 py-1 text-xs rounded-full border ${
                                      relevance.isStrong 
                                        ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                                        : relevance.isRelevant
                                        ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                        : 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                                    }`}>
                                      {relevance.matchText}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                          
                          <div className="mt-3 flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Auto-fill button clicked for:', college.name)
                                handleAutoFillSearch(college.name)
                              }}
                            >
                              Auto-fill Search
                            </Button>
                          </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Schools (25-75% chance) */}
                {suggestedColleges.filter(c => c.category === 'target').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      Target Schools (25-75% chance)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestedColleges.filter(c => c.category === 'target').map((college, index) => (
                        <motion.div
                          key={college.college_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCollegeSelect(college.college_id)}
                          className="college-card-wrapper"
                        >
                          <div className={`college-card-glow target ${selectedColleges.includes(college.college_id) ? 'active' : ''}`}></div>
                          <div className={`p-6 border rounded-xl transition-all duration-300 cursor-pointer ${
                            selectedColleges.includes(college.college_id)
                              ? 'border-yellow-400/50'
                              : 'border-yellow-400/30 bg-yellow-400/5 hover:border-yellow-400/50'
                          }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-white font-semibold">{college.name}</h4>
                              <p className="text-gray-400 text-sm">{college.selectivity_tier}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-yellow-400 font-bold text-lg">
                                {(college.probability * 100).toFixed(1)}%
                              </div>
                              <div className="text-yellow-400 text-sm font-medium">
                                Target
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Users className="w-4 h-4 text-yellow-400" />
                              <span>{(college.acceptance_rate * 100).toFixed(1)}% acceptance</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span>{college.city}, {college.state}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <DollarSign className="w-4 h-4 text-yellow-400" />
                              <span>${(() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                return tuitionInfo.tuition?.toLocaleString() || 'N/A'
                              })()} {zipcode && zipcode.length >= 5 && (() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                if (tuitionInfo.isInState === true) {
                                  return <span className="text-green-400 text-xs">(In-State)</span>
                                } else if (tuitionInfo.isInState === false) {
                                  return <span className="text-red-400 text-xs">(Out-of-State)</span>
                                }
                                return null
                              })()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Star className="w-4 h-4 text-yellow-400" />
                              <span>Good match</span>
                            </div>
                          </div>
                          
                          {/* Major Relevance */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Your Major Match:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30 font-medium">
                                {userProfile.major || 'Computer Science'}
                              </span>
                              {(() => {
                                const relevance = getMajorRelevanceInfo(college)
                                return (
                                  <span className={`px-2 py-1 text-xs rounded-full border ${
                                    relevance.isStrong 
                                      ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                                      : relevance.isRelevant
                                      ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                      : 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                                  }`}>
                                    {relevance.matchText}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Auto-fill button clicked for:', college.name)
                                handleAutoFillSearch(college.name)
                              }}
                            >
                              Auto-fill Search
                            </Button>
                          </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reach Schools (10-25% chance) */}
                {suggestedColleges.filter(c => c.category === 'reach').length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      Reach Schools (10-25% chance)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestedColleges.filter(c => c.category === 'reach').map((college, index) => (
                        <motion.div
                          key={college.college_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleCollegeSelect(college.college_id)}
                          className="college-card-wrapper"
                        >
                          <div className={`college-card-glow reach ${selectedColleges.includes(college.college_id) ? 'active' : ''}`}></div>
                          <div className={`p-6 border rounded-xl transition-all duration-300 cursor-pointer ${
                            selectedColleges.includes(college.college_id)
                              ? 'border-red-400/50'
                              : 'border-red-400/30 bg-red-400/5 hover:border-red-400/50'
                          }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-white font-semibold">{college.name}</h4>
                              <p className="text-gray-400 text-sm">{college.selectivity_tier}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold text-lg">
                                {(college.probability * 100).toFixed(1)}%
                              </div>
                              <div className="text-red-400 text-sm font-medium">
                                Reach
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Users className="w-4 h-4 text-red-400" />
                              <span>{(college.acceptance_rate * 100).toFixed(1)}% acceptance</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span>{college.city}, {college.state}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <DollarSign className="w-4 h-4 text-yellow-400" />
                              <span>${(() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                return tuitionInfo.tuition?.toLocaleString() || 'N/A'
                              })()} {zipcode && zipcode.length >= 5 && (() => {
                                const tuitionInfo = getTuitionInfoForZipcode(college, zipcode, tuitionDataMap.get(college.name))
                                if (tuitionInfo.isInState === true) {
                                  return <span className="text-green-400 text-xs">(In-State)</span>
                                } else if (tuitionInfo.isInState === false) {
                                  return <span className="text-red-400 text-xs">(Out-of-State)</span>
                                }
                                return null
                              })()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Star className="w-4 h-4 text-red-400" />
                              <span>Challenging</span>
                            </div>
                          </div>
                          
                          {/* Major Relevance */}
                          <div className="mt-3">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Your Major Match:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full border border-yellow-400/30 font-medium">
                                {userProfile.major || 'Computer Science'}
                              </span>
                              {(() => {
                                const relevance = getMajorRelevanceInfo(college)
                                return (
                                  <span className={`px-2 py-1 text-xs rounded-full border ${
                                    relevance.isStrong 
                                      ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                                      : relevance.isRelevant
                                      ? 'bg-blue-400/20 text-blue-400 border-blue-400/30'
                                      : 'bg-orange-400/20 text-orange-400 border-orange-400/30'
                                  }`}>
                                    {relevance.matchText}
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Auto-fill button clicked for:', college.name)
                                handleAutoFillSearch(college.name)
                              }}
                            >
                              Auto-fill Search
                            </Button>
                          </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>


      {/* Navigation */}
      <motion.div {...enter} className="mt-8 flex justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Button
          onClick={() => {
            // Save selected colleges and zipcode to localStorage for calculate page
            localStorage.setItem('selectedColleges', JSON.stringify(selectedColleges))
            if (zipcode) {
              localStorage.setItem('userZipcode', zipcode)
            }
            setShowLoader(true)
          }}
          disabled={selectedColleges.length === 0 || !zipcode || zipcode.length < 5}
        >
          <span className="flex items-center gap-2">
            Calculate My Chances
            <ChevronRight className="w-4 h-4" />
          </span>
        </Button>
      </motion.div>

      {/* Loader */}
      {showLoader && (
        <Loader
          onComplete={() => {
            router.push('/calculate')
          }}
          duration={5}
        />
      )}
    </div>
  )
}