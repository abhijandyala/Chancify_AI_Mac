'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, BarChart3, Target, Info } from 'lucide-react'
import { getAdmissionProbability, type PredictionRequest } from '@/lib/api'

interface ProbabilityExplorerProps {
  collegeId: string
  collegeName: string
  initialProfile: any
}

export default function ProbabilityExplorer({ collegeId, collegeName, initialProfile }: ProbabilityExplorerProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [probability, setProbability] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [baselineProbability, setBaselineProbability] = useState<number | null>(null)

  // Calculate baseline probability on mount
  useEffect(() => {
    calculateProbability(initialProfile)
  }, [])

  const calculateProbability = async (profileData: any) => {
    setIsLoading(true)
    try {
      const request: PredictionRequest = {
        ...profileData,
        college: collegeId,
        misc: profileData.misc ?? [],
      }
      
      const result = await getAdmissionProbability(request)
      if (result.success && result.probability) {
        setProbability(result.probability)
        if (baselineProbability === null) {
          setBaselineProbability(result.probability)
        }
      }
    } catch (error) {
      console.error('Error calculating probability:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateFactor = (factor: string, value: string) => {
    const newProfile = { ...profile, [factor]: value }
    setProfile(newProfile)
    calculateProbability(newProfile)
  }

  const getProbabilityChange = () => {
    if (!probability || !baselineProbability) return 0
    return ((probability - baselineProbability) / baselineProbability) * 100
  }

  const getChangeColor = () => {
    const change = getProbabilityChange()
    if (change > 5) return 'text-green-400'
    if (change < -5) return 'text-red-400'
    return 'text-yellow-400'
  }

  const getChangeIcon = () => {
    const change = getProbabilityChange()
    if (change > 5) return <TrendingUp className="w-4 h-4" />
    if (change < -5) return <TrendingDown className="w-4 h-4" />
    return <Target className="w-4 h-4" />
  }

  const factorOptions = {
    rigor: [
      { value: '1', label: '1 - Basic courses only' },
      { value: '3', label: '3 - Some honors courses' },
      { value: '5', label: '5 - Mix of honors and regular' },
      { value: '7', label: '7 - Many honors/AP courses' },
      { value: '10', label: '10 - Maximum rigor possible' }
    ],
    extracurricular_depth: [
      { value: '1', label: '1 - Minimal involvement' },
      { value: '3', label: '3 - Basic participation' },
      { value: '5', label: '5 - Regular involvement' },
      { value: '7', label: '7 - Strong commitment' },
      { value: '10', label: '10 - Exceptional depth' }
    ],
    essay_quality: [
      { value: '1', label: '1 - Poor writing' },
      { value: '3', label: '3 - Basic writing' },
      { value: '5', label: '5 - Good writing' },
      { value: '7', label: '7 - Strong writing' },
      { value: '10', label: '10 - Exceptional writing' }
    ],
    recommendations: [
      { value: '1', label: '1 - Weak recommendations' },
      { value: '3', label: '3 - Average recommendations' },
      { value: '5', label: '5 - Good recommendations' },
      { value: '7', label: '7 - Strong recommendations' },
      { value: '10', label: '10 - Outstanding recommendations' }
    ]
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rox-card"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/15 text-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Probability Explorer</h3>
            <p className="text-sm text-white/60">See how changing factors affects your chances at {collegeName}</p>
          </div>
        </div>

        {/* Current Probability Display */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Current Probability</span>
            <div className={`flex items-center gap-1 ${getChangeColor()}`}>
              {getChangeIcon()}
              <span className="text-sm font-medium">
                {getProbabilityChange() > 0 ? '+' : ''}{getProbabilityChange().toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-white">
              {isLoading ? '...' : probability ? `${(probability * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-all duration-1000"
                  style={{ width: `${(probability || 0) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Factor Controls */}
        <div className="space-y-4">
          <h4 className="font-semibold text-white">Adjust Factors to See Impact:</h4>
          
          {Object.entries(factorOptions).map(([factor, options]) => (
            <div key={factor} className="space-y-2">
              <label className="text-sm font-medium text-white/80 capitalize">
                {factor.replace('_', ' ')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFactor(factor, option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      profile[factor] === option.value
                        ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80'
                    }`}
                  >
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-400/10 border border-blue-400/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-400/80">
              <p className="font-medium mb-1">How to Use This Tool</p>
              <p>Adjust the factors above to see how they impact your admission probability. This helps you understand which areas to focus on for improvement.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
