'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, Target, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { getAdmissionProbability, type PredictionRequest } from '@/lib/api'

interface CollegeComparisonProps {
  colleges: Array<{
    id: string
    name: string
    tier: string
    acceptance_rate: number
  }>
  userProfile: any
}

export default function CollegeComparison({ colleges, userProfile }: CollegeComparisonProps) {
  const [results, setResults] = useState<Array<{
    college: any
    probability: number
    category: string
    ml_probability: number
    formula_probability: number
  }>>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (colleges.length > 0) {
      calculateAllProbabilities()
    }
  }, [colleges, userProfile])

  const calculateAllProbabilities = async () => {
    setIsLoading(true)
    const promises = colleges.map(async (college) => {
      try {
        const request: PredictionRequest = {
          ...userProfile,
          college: college.id,
          misc: userProfile.misc ?? [],
        }
        
        const result = await getAdmissionProbability(request)
        if (result.success) {
          return {
            college,
            probability: result.probability || 0,
            category: result.category || 'unknown',
            ml_probability: result.ml_probability || 0,
            formula_probability: result.formula_probability || 0
          }
        }
        return null
      } catch (error) {
        console.error('Error calculating probability for', college.name, error)
        return null
      }
    })

    const results = (await Promise.all(promises)).filter((result): result is NonNullable<typeof result> => result !== null)
    setResults(results)
    setIsLoading(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'safety': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'target': return <Target className="w-4 h-4 text-yellow-400" />
      case 'reach': return <AlertCircle className="w-4 h-4 text-red-400" />
      default: return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'safety': return 'text-green-400'
      case 'target': return 'text-yellow-400'
      case 'reach': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Elite': return 'bg-purple-400/20 text-purple-400 border-purple-400/30'
      case 'Highly Selective': return 'bg-blue-400/20 text-blue-400 border-blue-400/30'
      case 'Selective': return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
      case 'Moderately Selective': return 'bg-green-400/20 text-green-400 border-green-400/30'
      case 'Less Selective': return 'bg-gray-400/20 text-gray-400 border-gray-400/30'
      default: return 'bg-gray-400/20 text-gray-400 border-gray-400/30'
    }
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rox-card"
      >
        <div className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/60">Calculating comparison...</p>
        </div>
      </motion.div>
    )
  }

  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rox-card"
      >
        <div className="p-6 text-center">
          <p className="text-white/60">No colleges to compare</p>
        </div>
      </motion.div>
    )
  }

  // Sort results by probability (highest first)
  const sortedResults = [...results].sort((a, b) => b.probability - a.probability)

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
            <h3 className="text-lg font-bold text-white">College Comparison</h3>
            <p className="text-sm text-white/60">Compare your chances across selected colleges</p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="space-y-4">
          {sortedResults.map((result, index) => (
            <div
              key={result.college.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(result.category)}
                    <span className="text-sm font-medium text-white">
                      #{index + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{result.college.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getTierColor(result.college.tier)}`}>
                        {result.college.tier}
                      </span>
                      <span className="text-xs text-white/60">
                        {result.college.acceptance_rate.toFixed(1)}% acceptance rate
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {(result.probability * 100).toFixed(1)}%
                  </div>
                  <div className={`text-sm font-medium ${getCategoryColor(result.category)}`}>
                    {result.category.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      result.category === 'safety' ? 'bg-green-400' :
                      result.category === 'target' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${result.probability * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">ML Model:</span>
                  <span className="text-white ml-2">{(result.ml_probability * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-white/60">Formula:</span>
                  <span className="text-white ml-2">{(result.formula_probability * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <h4 className="font-semibold text-white mb-3">Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {results.filter(r => r.category === 'safety').length}
              </div>
              <div className="text-xs text-white/60">Safety Schools</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {results.filter(r => r.category === 'target').length}
              </div>
              <div className="text-xs text-white/60">Target Schools</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">
                {results.filter(r => r.category === 'reach').length}
              </div>
              <div className="text-xs text-white/60">Reach Schools</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
