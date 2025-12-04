export type ProfileField =
  | 'gpa_unweighted'
  | 'gpa_weighted'
  | 'sat'
  | 'act'
  | 'ap_count'
  | 'honors_count'
  | 'class_rank_percentile'
  | 'class_size'
  | 'extracurricular_depth'
  | 'leadership_positions'
  | 'awards_publications'
  | 'passion_projects'
  | 'business_ventures'
  | 'volunteer_work'
  | 'research_experience'
  | 'portfolio_audition'
  | 'geographic_diversity'
  | 'firstgen_diversity'
  | 'hs_reputation'

export const FIELD_LABELS: Record<ProfileField, string> = {
  gpa_unweighted: 'Unweighted GPA',
  gpa_weighted: 'Weighted GPA',
  sat: 'SAT Score',
  act: 'ACT Score',
  ap_count: 'AP Courses',
  honors_count: 'Honors Courses',
  class_rank_percentile: 'Class Rank %',
  class_size: 'Class Size',
  extracurricular_depth: 'Extracurricular Depth',
  leadership_positions: 'Leadership',
  awards_publications: 'Awards & Publications',
  passion_projects: 'Passion Projects',
  business_ventures: 'Business Ventures',
  volunteer_work: 'Volunteer Work',
  research_experience: 'Research Experience',
  portfolio_audition: 'Portfolio / Audition',
  geographic_diversity: 'Geographic Diversity',
  firstgen_diversity: 'First-Generation / Diversity',
  hs_reputation: 'High School Reputation'
}

export type ApplicationMetric = {
  field?: ProfileField
  label: string
  rawValue: string
  mappedValue?: string
  reason?: string
  miscEntry?: string
}

export type ParsedApplicationData = {
  updates: Partial<Record<ProfileField, string>>
  misc: string[]
  metrics: ApplicationMetric[]
}

/**
 * Parse application data with optional OpenAI fallback for robust extraction
 */
export const parseApplicationData = async (
  rawText: string,
  useOpenAIFallback: boolean = true
): Promise<ParsedApplicationData> => {
  let text = rawText.replace(/\r/g, '\n')

  // Remove essays, parents info, and other excluded sections
  text = stripExcludedSections(text)

  const updates: Partial<Record<ProfileField, string>> = {}
  const metrics: ApplicationMetric[] = []
  const miscSet = new Set<string>()

  const recordMetric = (field: ProfileField, rawValue: string, mappedValue?: string, reason?: string) => {
    const metric: ApplicationMetric = {
      field,
      label: FIELD_LABELS[field],
      rawValue,
      mappedValue,
      reason
    }
    metrics.push(metric)
    if (mappedValue !== undefined) {
      updates[field] = mappedValue
    }
  }

  // Improved GPA extraction - multiple patterns
  const gpaPatterns = [
    /weighted\s*(?:gpa|grade\s*point\s*average)[\s:]*(\d\.\d{1,2})/i,
    /gpa[^0-9]{0,15}weighted[\s:]*(\d\.\d{1,2})/i,
    /(\d\.\d{1,2})\s*(?:weighted|\(weighted\))/i,
    /weighted[^0-9]{0,10}(\d\.\d{1,2})/i
  ]
  let weightedGpa: string | undefined
  for (const pattern of gpaPatterns) {
    const match = text.match(pattern)
    if (match) {
      weightedGpa = match[1]
      break
    }
  }
  if (weightedGpa) {
    recordMetric('gpa_weighted', `${weightedGpa}`, weightedGpa, 'Found weighted GPA')
  }

  const unweightedPatterns = [
    /unweighted\s*(?:gpa|grade\s*point\s*average)[\s:]*(\d\.\d{1,2})/i,
    /gpa[^0-9]{0,15}unweighted[\s:]*(\d\.\d{1,2})/i,
    /(\d\.\d{1,2})\s*(?:unweighted|\(unweighted\))/i,
    /unweighted[^0-9]{0,10}(\d\.\d{1,2})/i
  ]
  let unweightedGpa: string | undefined
  for (const pattern of unweightedPatterns) {
    const match = text.match(pattern)
    if (match) {
      unweightedGpa = match[1]
      break
    }
  }
  if (!unweightedGpa) {
    // Fallback: look for GPA: X.XX format
    const generalGpa = text.match(/\bgpa\s*[:\-]?\s*(\d\.\d{1,2})\b/i)
    if (generalGpa) {
      unweightedGpa = generalGpa[1]
    }
  }
  if (unweightedGpa) {
    recordMetric('gpa_unweighted', `${unweightedGpa}`, unweightedGpa, 'Found unweighted GPA')
  }

  // ENHANCED SAT extraction - multiple patterns including date formats
  const satPatterns = [
    // "SAT (Aug 2024): 1470 (ERW 710, Math 760)"
    /sat\s*\([^)]+\)\s*[:\-]?\s*(\d{3,4})\b/i,
    // "SAT: 1470" or "SAT - 1470" or "SAT 1470"
    /sat[^\n]{0,30}?[:\-]?\s*(\d{3,4})\b/i,
    // "1470 on SAT" or "1470 from SAT"
    /(\d{3,4})\s*(?:on|from|score\s*on)?\s*(?:the\s*)?sat/i,
    // "SAT Score: 1470"
    /\bsat\s*score[:\-]?\s*(\d{3,4})\b/i,
    // "SAT Composite: 1470"
    /\bsat\s*composite[:\-]?\s*(\d{3,4})\b/i,
    // Look for composite score in parentheses: "(1470)"
    /\bsat[^\d]{0,50}?\((\d{3,4})\)/i,
    // "Total SAT: 1470"
    /total\s*sat[:\-]?\s*(\d{3,4})\b/i
  ]
  let satScore: string | undefined
  for (const pattern of satPatterns) {
    const match = text.match(pattern)
    if (match && parseInt(match[1]) >= 400 && parseInt(match[1]) <= 1600) {
      satScore = match[1]
      break
    }
  }
  if (satScore) {
    recordMetric('sat', `${satScore}`, satScore, 'Found SAT score')
  }

  // ENHANCED ACT extraction - multiple patterns including composite details
  const actPatterns = [
    // "ACT: Composite 33 (English 32, Math 34, Reading 33, Science 33)"
    /act[^\n]{0,50}?composite\s*(\d{1,2})\b/i,
    // "ACT Composite: 33"
    /\bact\s*composite[:\-]?\s*(\d{1,2})\b/i,
    // "ACT: 33" or "ACT - 33" or "ACT 33"
    /act[^\n]{0,30}?[:\-]?\s*(\d{1,2})\b/i,
    // "33 on ACT" or "33 from ACT"
    /(\d{1,2})\s*(?:on|from|score\s*on)?\s*(?:the\s*)?act/i,
    // "ACT Score: 33"
    /\bact\s*score[:\-]?\s*(\d{1,2})\b/i,
    // Look for composite score in parentheses: "(33)"
    /\bact[^\d]{0,50}?\((\d{1,2})\)/i
  ]
  let actScore: string | undefined
  for (const pattern of actPatterns) {
    const match = text.match(pattern)
    if (match && parseInt(match[1]) >= 1 && parseInt(match[1]) <= 36) {
      actScore = match[1]
      break
    }
  }
  if (actScore) {
    recordMetric('act', `${actScore}`, actScore, 'Found ACT score')
  }

  // MUCH BETTER AP Course counting - count actual AP course mentions
  const apCourseMatches = text.match(/\bap\s+[a-z]{2,}(?:\s+[a-z]{1,2})?\b/gi)
  const uniqueApCourses = new Set<string>()
  if (apCourseMatches) {
    apCourseMatches.forEach(match => {
      const normalized = match.trim().toUpperCase()
      if (normalized.length > 2 && normalized.length < 30) {
        uniqueApCourses.add(normalized)
      }
    })
  }
  // Also look for "AP CSA", "AP CSP" etc (AP followed by abbreviation)
  const apAbbrevMatches = text.match(/\bap\s+[A-Z]{2,4}\b/gi)
  if (apAbbrevMatches) {
    apAbbrevMatches.forEach(match => {
      uniqueApCourses.add(match.trim().toUpperCase())
    })
  }
  // Also look for "AP Exam" mentions with course names
  const apExamMatches = text.match(/\bap\s+exam[^:\n]{0,30}[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi)
  if (apExamMatches) {
    apExamMatches.forEach(match => {
      const courseMatch = match.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)
      if (courseMatch) {
        uniqueApCourses.add(`AP ${courseMatch[1]}`)
      }
    })
  }

  const apCount = uniqueApCourses.size
  if (apCount > 0) {
    const apList = Array.from(uniqueApCourses).slice(0, 15).join(', ')
    recordMetric('ap_count', `${apCount}`, `${apCount}`, `${apCount} AP courses found: ${apList}`)
    miscSet.add(`AP Courses: ${apList}`)
  }

  // Better Honors course counting
  const honorsMatches = text.match(/\bhonors\s+[a-z]+(?:\s+[a-z]+)*\b/gi)
  const uniqueHonorsCourses = new Set<string>()
  if (honorsMatches) {
    honorsMatches.forEach(match => {
      const normalized = match.trim()
      if (normalized.length > 6 && !normalized.toLowerCase().includes('award')) {
        uniqueHonorsCourses.add(normalized)
      }
    })
  }
  const honorsCount = uniqueHonorsCourses.size
  if (honorsCount > 0) {
    const honorsList = Array.from(uniqueHonorsCourses).slice(0, 10).join(', ')
    recordMetric('honors_count', `${honorsCount}`, `${honorsCount}`, `${honorsCount} honors courses found`)
    if (honorsCount <= 10) {
      miscSet.add(`Honors Courses: ${honorsList}`)
    }
  }

  // Improved Class Rank extraction - handle multiple formats
  const rankPatterns = [
    /class\s*rank[^0-9]{0,15}(\d{1,3})\s*\/\s*(\d{2,4})/i, // "23/420"
    /(\d{1,3})\s*\/\s*(\d{2,4})\s*\([^)]*top[^)]*(\d{1,2})/i, // "23/420 (Top ~5%)"
    /top\s*~?(\d{1,2})\s*%/i, // "Top ~5%"
    /class\s*rank[^0-9]{0,15}(\d{1,2})\s*%/i // "Class Rank: 5%"
  ]
  let classRank: string | undefined
  for (const pattern of rankPatterns) {
    const match = text.match(pattern)
    if (match) {
      if (match[3]) {
        // Format: "23/420 (Top ~5%)" - use the percentage
        classRank = match[3]
      } else if (match[1] && match[2]) {
        // Format: "23/420" - calculate percentage
        const rankNum = parseInt(match[1])
        const classSizeNum = parseInt(match[2])
        if (classSizeNum > 0) {
          const percentile = Math.round((rankNum / classSizeNum) * 100)
          classRank = percentile.toString()
        }
      } else if (match[1]) {
        // Format: "Top 5%" or "Class Rank: 5%"
        classRank = match[1]
      }
      if (classRank) break
    }
  }
  if (classRank) {
    recordMetric('class_rank_percentile', `${classRank}%`, classRank, 'Found class rank percentile')
  }

  // Improved Class Size extraction
  const classSizePatterns = [
    /class\s*size[^0-9]{0,15}(\d{2,4})\b/i,
    /class\s*of\s*(\d{2,4})\b/i,
    /(\d{2,4})\s*students\s*(?:in|per)\s*(?:my\s*)?class/i,
    /cohort\s*of\s*(\d{2,4})\b/i
  ]
  let classSize: string | undefined
  for (const pattern of classSizePatterns) {
    const match = text.match(pattern)
    if (match) {
      const size = parseInt(match[1])
      if (size >= 10 && size <= 5000) {
        classSize = match[1]
        break
      }
    }
  }
  if (classSize) {
    recordMetric('class_size', `${classSize}`, classSize, 'Found class size')
  }

  // Extract structured sections into MISC
  extractStructuredSections(text, miscSet)

  // Extract detailed activities
  extractActivities(text, miscSet)

  // Extract awards and honors
  extractAwards(text, miscSet)

  // Extract courses/curriculum info
  extractCourses(text, miscSet)

  // Extract additional information section
  extractAdditionalInfo(text, miscSet)

  // Extract testing-specific lines (SAT/ACT/AP exam summaries)
  extractTestingDetails(text, miscSet)

  // Derive factor insights
  const derived = deriveFactorInsights(text)
  Object.assign(updates, derived.updates)
  derived.misc.forEach(entry => miscSet.add(entry))
  metrics.push(...derived.metrics)

  // Deduplicate and clean up MISC items
  let cleanedMisc = cleanAndDeduplicateMisc(Array.from(miscSet))

  // If important fields are missing and OpenAI fallback is enabled, try OpenAI parsing
  // Trigger OpenAI if: no SAT/ACT found, or missing GPA, or missing other key metrics
  const missingCriticalFields = (!satScore && !actScore) || (!weightedGpa && !unweightedGpa) || (!apCount && !classRank)
  if (useOpenAIFallback && missingCriticalFields && typeof window !== 'undefined') {
    try {
      const aiResult = await fetchOpenAIParse(rawText)
      if (aiResult.success && aiResult.updates) {
        // Merge AI-extracted updates (only for missing fields)
        Object.entries(aiResult.updates).forEach(([key, value]) => {
          const field = key as ProfileField
          if (!updates[field] && value) {
            updates[field] = value
            recordMetric(field, value, value, 'Extracted via OpenAI')
          }
        })

        // Merge AI-extracted misc items (avoid duplicates)
        if (aiResult.misc && aiResult.misc.length > 0) {
          aiResult.misc.forEach(item => {
            const normalized = item.trim().toLowerCase()
            const isDuplicate = cleanedMisc.some(existing =>
              existing.toLowerCase() === normalized ||
              existing.toLowerCase().includes(normalized) ||
              normalized.includes(existing.toLowerCase())
            )
            if (!isDuplicate && item.trim().length > 10) {
              miscSet.add(item.trim())
            }
          })
          cleanedMisc = cleanAndDeduplicateMisc(Array.from(miscSet))
        }
      }
    } catch (error) {
      console.warn('OpenAI parsing fallback failed:', error)
      // Continue with regex-only results
    }
  }

  return {
    updates,
    misc: cleanedMisc,
    metrics
  }
}

/**
 * Call backend OpenAI endpoint to parse application document
 */
async function fetchOpenAIParse(documentText: string): Promise<{
  success: boolean
  updates: Record<string, string>
  misc: string[]
  error?: string
}> {
  try {
    // Get backend URL from config
    const { getApiBaseUrl } = await import('@/lib/config')
    const backendUrl = getApiBaseUrl()

    const response = await fetch(`${backendUrl}/api/openai/parse-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_text: documentText
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to call OpenAI parsing endpoint:', error)
    return {
      success: false,
      updates: {},
      misc: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clean up and deduplicate MISC items:
 * - Remove exact duplicates
 * - Remove items that are substrings of other items
 * - Break down large chunks into smaller, structured items
 * - Normalize formatting
 */
function cleanAndDeduplicateMisc(items: string[]): string[] {
  if (items.length === 0) return []

  // Normalize items (trim, remove extra spaces)
  const normalized = items
    .map(item => item.trim().replace(/\s+/g, ' '))
    .filter(item => item.length > 0)

  // Remove exact duplicates (case-insensitive)
  const unique = new Set<string>()
  const seenLower = new Set<string>()

  for (const item of normalized) {
    const key = normalizeMiscKey(item)
    if (!key) continue

    if (!seenLower.has(key)) {
      seenLower.add(key)
      unique.add(item.trim())
    }
  }

  const uniqueItems = Array.from(unique)

  // Additional pass: remove entries that only differ by trailing punctuation or spacing
  const punctuationMap = new Map<string, string>()
  const dedupedItems: string[] = []
  for (const item of uniqueItems) {
    const normalizedWithoutPunctuation = normalizeMiscKey(item.replace(/[.,;:!?]+$/, ''))
    if (normalizedWithoutPunctuation && !punctuationMap.has(normalizedWithoutPunctuation)) {
      punctuationMap.set(normalizedWithoutPunctuation, item)
      dedupedItems.push(item)
    }
  }

  const chunkSource = dedupedItems.length ? dedupedItems : uniqueItems

  // Break down large chunks into smaller items
  const chunked: string[] = []
  for (const item of chunkSource) {
    // If item is very long (>300 chars), try to break it down
    if (item.length > 300) {
      const broken = breakDownLargeChunk(item)
      chunked.push(...broken)
    } else {
      chunked.push(item)
    }
  }
  const chunkedDeduped = dedupeEntries(chunked)

  // Remove items that are semantically similar to longer items (keep the longer, more complete one)
  // Use semantic similarity instead of simple substring matching
  const filtered: string[] = []
  for (const item of chunkedDeduped) {
    let isSimilarToLonger = false
    const itemNorm = normalizeMiscKey(item)
    
    if (!itemNorm) continue
    
    for (const other of chunkedDeduped) {
      if (item !== other && other.length >= item.length) {
        const otherNorm = normalizeMiscKey(other)
        if (!otherNorm) continue

        // Use semantic similarity to detect duplicates
        if (areSemanticallySimilar(itemNorm, otherNorm)) {
          // Prefer the longer, more complete version
          if (other.length > item.length * 1.1) {
            isSimilarToLonger = true
            break
          } else if (other.length < item.length * 1.1 && other.length >= item.length) {
            // If they're similar length, prefer the one that comes first in the array (original order)
            const itemIndex = chunkedDeduped.indexOf(item)
            const otherIndex = chunkedDeduped.indexOf(other)
            if (otherIndex < itemIndex) {
              isSimilarToLonger = true
              break
            }
          }
        }
      }
    }
    if (!isSimilarToLonger) {
      filtered.push(item)
    }
  }

  // Filter out any lingering parent/guardian info (should have been excluded earlier)
  const parentFiltered = filtered.filter(
    entry => !/\b(parent|mother|father|guardian)\b/i.test(entry.replace(/[^a-zA-Z\s]/g, '').trim())
  )

  // Final aggressive deduplication pass using semantic similarity
  // Run deduplication multiple times to catch any remaining duplicates
  let finalDeduped = dedupeEntries(parentFiltered)
  
  // Run one more time to catch any that slipped through
  finalDeduped = dedupeEntries(finalDeduped)
  
  // One more pass: remove any entries that are clearly subsets or near-duplicates
  const finalFiltered: string[] = []
  const seenFinal = new Map<string, string>() // Map normalized key -> original entry
  
  for (const item of finalDeduped) {
    const itemNorm = normalizeMiscKey(item)
    if (!itemNorm || itemNorm.length < 10) continue // Skip very short entries
    
    let shouldKeep = true
    let replaced = false
    
    // Check against all already-seen entries
    for (const [seenNorm, seenOriginal] of seenFinal.entries()) {
      if (areSemanticallySimilar(itemNorm, seenNorm)) {
        // If current item is longer/more complete, replace the existing one
        if (itemNorm.length > seenNorm.length * 1.05) {
          finalFiltered[finalFiltered.indexOf(seenOriginal)] = item
          seenFinal.delete(seenNorm)
          seenFinal.set(itemNorm, item)
          replaced = true
          break
        } else {
          // Current item is similar but not better, skip it
          shouldKeep = false
          break
        }
      }
    }
    
    if (shouldKeep && !replaced) {
      finalFiltered.push(item)
      seenFinal.set(itemNorm, item)
    }
  }

  return sortMiscEntries(finalFiltered)
}

/**
 * Normalize misc entry for deduplication - removes prefixes, punctuation, normalizes spacing
 */
const normalizeMiscKey = (value: string): string => {
  let normalized = value.toLowerCase()
  
  // Remove common prefixes that add no semantic meaning
  const prefixesToRemove = [
    /^testing\s+detail\s*[:•\-]?\s*/i,
    /^award\/honor\s*[:•\-]?\s*/i,
    /^honors?\s*&?\s*awards?\s*[•\-\*]?\s*/i,
    /^independent\s+project\s*[:•\-]?\s*/i,
    /^education\s+detail\s*[:•\-]?\s*/i,
    /^ap\s+exams?\s*[:•\-]?\s*/i,
    /^ap\s+courses?\s*[:•\-]?\s*/i,
    /^honors?\s+courses?\s*[:•\-]?\s*/i,
    /^course\s+list\s*[:•\-]?\s*/i,
    /^activities?\s*\(summary\)\s*[:•\-]?\s*/i,
    /^\d+\.\s+/,  // Remove numbered prefixes like "6. Honors & Awards"
  ]
  
  for (const prefix of prefixesToRemove) {
    normalized = normalized.replace(prefix, '')
  }
  
  // Normalize punctuation, spacing, and special characters
  normalized = normalized
    .replace(/[“”]/g, '"')
    .replace(/[']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[•\-\*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')  // Remove trailing punctuation
    .replace(/^[.,;:!?\s]+/, '')  // Remove leading punctuation/spaces
    .trim()
  
  return normalized
}

/**
 * Check if two normalized strings are semantically similar (one contains the other after removing small word differences)
 */
const areSemanticallySimilar = (norm1: string, norm2: string): boolean => {
  // Exact match after normalization
  if (norm1 === norm2) return true
  
  // If one is empty after normalization, not similar
  if (!norm1 || !norm2) return false
  
  // If one is contained in the other and they're close in length (handle truncation)
  const shorter = norm1.length < norm2.length ? norm1 : norm2
  const longer = norm1.length >= norm2.length ? norm1 : norm2
  
  // Check if shorter is a substantial substring of longer (handle truncation)
  if (longer.includes(shorter)) {
    const ratio = shorter.length / longer.length
    const lengthDiff = longer.length - shorter.length
    
    // More lenient matching for truncated entries:
    // (1) 65%+ match OR (2) difference is small (<50 chars) and shorter is substantial (>30 chars)
    // OR (3) shorter starts the longer string (likely truncation) and is >25 chars
    const isPrefix = longer.indexOf(shorter) === 0
    if (ratio >= 0.65 || (lengthDiff < 50 && shorter.length > 30) || (isPrefix && shorter.length > 25)) {
      return true
    }
  }
  
  // Try removing common prefixes from both and comparing again
  const removeCommonPrefixes = (s: string) => {
    return s
      .replace(/^(sat|act|ap)\s*/i, '')
      .replace(/^(part-?|full-?)?time\s*/i, '')
      .replace(/^(founder|president|captain|team)\s*/i, '')
  }
  
  const norm1NoPrefix = removeCommonPrefixes(norm1)
  const norm2NoPrefix = removeCommonPrefixes(norm2)
  
  if (norm1NoPrefix !== norm1 || norm2NoPrefix !== norm2) {
    // If removing prefixes changed something, check similarity again
    if (norm1NoPrefix === norm2NoPrefix) return true
    const shorterNoPrefix = norm1NoPrefix.length < norm2NoPrefix.length ? norm1NoPrefix : norm2NoPrefix
    const longerNoPrefix = norm1NoPrefix.length >= norm2NoPrefix.length ? norm1NoPrefix : norm2NoPrefix
    if (longerNoPrefix.includes(shorterNoPrefix)) {
      const ratio = shorterNoPrefix.length / longerNoPrefix.length
      const isPrefix = longerNoPrefix.indexOf(shorterNoPrefix) === 0
      // More lenient: 65%+ match OR prefix match with substantial content (>25 chars)
      if (ratio >= 0.65 || (isPrefix && shorterNoPrefix.length > 25)) {
        return true
      }
    }
  }
  
  return false
}

const dedupeEntries = (entries: string[]): string[] => {
  const seen = new Set<string>()
  const deduped: string[] = []

  // First pass: exact normalized duplicates
  const exactMap = new Map<string, string>()
  for (const entry of entries) {
    const key = normalizeMiscKey(entry)
    if (!key) continue
    
    if (!exactMap.has(key)) {
      exactMap.set(key, entry.trim())
    }
  }
  
  // Second pass: semantic similarity (catch near-duplicates)
  const semanticDeduped: string[] = []
  const seenSemantic = new Set<string>()
  
  for (const [normKey, originalEntry] of exactMap.entries()) {
    let isDuplicate = false
    
    // Check against all already-seen entries
    for (const seenKey of seenSemantic) {
      if (areSemanticallySimilar(normKey, seenKey)) {
        isDuplicate = true
        // Keep the longer, more complete version
        const existingEntry = exactMap.get(seenKey)
        if (existingEntry && originalEntry.length > existingEntry.length) {
          // Replace with longer version
          const index = semanticDeduped.findIndex(e => normalizeMiscKey(e) === seenKey)
          if (index !== -1) {
            semanticDeduped[index] = originalEntry
            seenSemantic.delete(seenKey)
            seenSemantic.add(normKey)
          }
        }
        break
      }
    }
    
    if (!isDuplicate) {
      semanticDeduped.push(originalEntry)
      seenSemantic.add(normKey)
    }
  }
  
  return semanticDeduped
}

/**
 * Sort misc entries so related topics stay grouped (testing, academics, activities, etc.)
 */
const sortMiscEntries = (entries: string[]): string[] => {
  const categorized = entries.map((entry, index) => ({
    entry,
    priority: getMiscPriority(entry),
    order: index
  }))

  return categorized
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      if (b.entry.length !== a.entry.length) {
        return b.entry.length - a.entry.length
      }
      return a.order - b.order
    })
    .map(item => item.entry)
}

const getMiscPriority = (entry: string): number => {
  const lower = entry.toLowerCase()

  if (/(sat|act|psat|testing detail|ap exam|ib exam)/.test(lower)) return 90
  if (/(ap courses|honors courses|course list|class rank|gpa|education detail|subject emphasis)/.test(lower)) return 80
  if (/(award|honor|finalist|nominee|scholar|distinction)/.test(lower)) return 75
  if (/(research|project|prototype|app|startup|business|venture|internship)/.test(lower)) return 70
  if (/(captain|president|team|council|leader|treasurer|orchestra|club|varsity|committee|student council)/.test(lower)) return 65
  if (/(volunteer|service|community|tutor|outreach|nonprofit)/.test(lower)) return 60
  if (/(employment|job|barista|work|assistant|staff|cashier)/.test(lower)) return 55
  if (/(parent|mother|father|guardian)/.test(lower)) return 5
  return 40
}

/**
 * Break down large text chunks into smaller, structured items
 */
function breakDownLargeChunk(chunk: string): string[] {
  const items: string[] = []

  // Try to split on common delimiters
  const sections = chunk.split(/(?:\. |\n|• |\* |- |\d+\.\s+)/).filter(s => s.trim().length > 10)

  // If splitting produced many sections, use them
  if (sections.length > 2) {
    for (const section of sections) {
      const trimmed = section.trim()
      if (trimmed.length > 15 && trimmed.length < 300) {
        items.push(trimmed)
      }
    }
  } else {
    // If splitting didn't work well, try to find structured sections
    // Look for patterns like "Parent 1:", "Parent 2:", "Testing Detail:", etc.
    const sectionPatterns = [
      /(Testing\s+Detail[^:]*:[^•\n]{0,200})/gi,
      /(Family\s+Information[^:]*:[^•\n]{0,200})/gi,
      /(Activities[^:]*:[^•\n]{0,200})/gi,
      /(Honors?\s+&?\s*Awards?[^:]*:[^•\n]{0,200})/gi,
      /(Parent\s*\d+[^:]*:[^•\n]{0,150})/gi
    ]

    const extracted: string[] = []
    for (const pattern of sectionPatterns) {
      const matches = chunk.match(pattern)
      if (matches) {
        extracted.push(...matches.map(m => m.trim()))
      }
    }

    if (extracted.length > 0) {
      items.push(...extracted)
    } else {
      // Last resort: split by sentences if really long
      const sentences = chunk.match(/[^.!?]+[.!?]+/g) || []
      if (sentences.length > 3) {
        // Group sentences into logical chunks
        let currentChunk = ''
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length < 250) {
            currentChunk += sentence.trim() + ' '
          } else {
            if (currentChunk.trim().length > 20) {
              items.push(currentChunk.trim())
            }
            currentChunk = sentence.trim() + ' '
          }
        }
        if (currentChunk.trim().length > 20) {
          items.push(currentChunk.trim())
        }
      } else {
        // Can't break down, return as is
        items.push(chunk)
      }
    }
  }

  return items.length > 0 ? items : [chunk]
}

const stripExcludedSections = (text: string): string => {
  const lines = text.split('\n')
  const cleaned: string[] = []
  let skipping = false
  let skipUntilNextSection = false

  const looksLikeHeading = (line: string) => {
    if (!line) return false
    if (line.length > 120) return false
    if (/^\s*\d+\.\s*/.test(line)) return true
    if (line.endsWith(':')) return true
    const wordCount = line.split(/\s+/).length
    if (wordCount <= 8 && /^[A-Za-z0-9\s“”"'&,\-\–—:]+$/.test(line)) return true
    return false
  }

  const getSkipCategory = (line: string): 'essay' | 'parent' | null => {
    if (!looksLikeHeading(line)) return null
    const normalized = line.toLowerCase()
    if (/(essay|personal statement|supplemental|short answer|prompt)/.test(normalized)) {
      return 'essay'
    }
    if (/(^parent|guardian|family information|family background)/.test(normalized)) {
      return 'parent'
    }
    return null
  }

  const shouldSkipInline = (line: string) => /^\s*(parent|guardian|mother|father)\s*[:\-]/i.test(line)

  lines.forEach(line => {
    const trimmed = line.trim()

    if (!skipping && trimmed) {
      const skipCategory = getSkipCategory(trimmed)
      if (skipCategory) {
        skipping = true
        skipUntilNextSection = true
        return
      }
    }

    if (skipUntilNextSection && trimmed && looksLikeHeading(trimmed) && !getSkipCategory(trimmed)) {
      skipping = false
      skipUntilNextSection = false
      cleaned.push(line)
      return
    }

    if (skipping) {
      return
    }

    if (trimmed && shouldSkipInline(trimmed)) {
      return
    }

    cleaned.push(line)
  })

  return cleaned.join('\n')
}

const extractStructuredSections = (text: string, miscSet: Set<string>) => {
  // Capture key numbered sections so details show up in MISC
  extractSectionEntries(
    text,
    /\b2\.\s*Education\b/i,
    {
      prefix: 'Education Detail',
      maxEntries: 15,
      minLength: 10,
      skipPattern: /(parent|guardian)/i
    },
    miscSet
  )

  extractSectionEntries(
    text,
    /\b3\.\s*Testing\b/i,
    {
      prefix: 'Testing Detail',
      maxEntries: 12,
      minLength: 8
    },
    miscSet
  )

  // Extract Activities section
  const activitiesMatch = text.match(/activities[^a-z]*?([\s\S]{0,2000})/i)
  if (activitiesMatch && activitiesMatch[1]) {
    const activitiesText = activitiesMatch[1]
      .split(/\n{2,}/)
      .filter(block => block.trim().length > 20)
      .slice(0, 20)
      .map(block => block.trim().replace(/\s+/g, ' '))
      .filter(block => !/essay|parent|family/i.test(block))

    activitiesText.forEach(activity => {
      if (activity.length > 15 && activity.length < 300) {
        miscSet.add(activity)
      }
    })
  }
}

type SectionExtractionOptions = {
  prefix: string
  maxEntries?: number
  minLength?: number
  skipPattern?: RegExp
}

const extractSectionEntries = (
  text: string,
  headingPattern: RegExp,
  options: SectionExtractionOptions,
  miscSet: Set<string>
) => {
  const match = headingPattern.exec(text)
  if (!match) {
    return
  }

  const startIndex = match.index + match[0].length
  const remainder = text.slice(startIndex)
  const nextHeadingIndex = remainder.search(/\n\s*\d+\.\s+[A-Z]/)
  const sectionBody = nextHeadingIndex === -1 ? remainder : remainder.slice(0, nextHeadingIndex)

  sectionBody
    .split(/\n+/)
    .map(line => line.trim().replace(/\s+/g, ' '))
    .map(line => line.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, ''))
    .filter(line => line.length >= (options.minLength ?? 8))
    .filter(line => {
      if (!options.skipPattern) return true
      return !options.skipPattern.test(line.toLowerCase())
    })
    .slice(0, options.maxEntries ?? 10)
    .forEach(line => miscSet.add(`${options.prefix}: ${line}`))
}

const extractActivities = (text: string, miscSet: Set<string>) => {
  // Look for bullet points and structured activity entries
  const activityPatterns = [
    /[•\-\*]\s*([A-Z][^•\-\*\n]{10,200})/g, // Bullet points
    /^\s*\d+\.\s*([A-Z][^\n]{10,200})/gm, // Numbered list
    /([A-Z][a-z]+(?:\s+[a-z]+)*)[,\s]+(?:founder|president|captain|leader|member|participant)[^.\n]{0,150}/gi // Role mentions
  ]

  activityPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const activity = match[1].trim()
      if (activity.length > 15 && activity.length < 250 && !/essay|parent|family|mother|father/i.test(activity)) {
        // Clean up the activity text
        const cleaned = activity.replace(/\s+/g, ' ').trim()
        if (cleaned.length > 10) {
          miscSet.add(cleaned)
        }
      }
    }
  })
}

const extractAwards = (text: string, miscSet: Set<string>) => {
  const awardsSection = text.match(/(?:honors?\s*&?\s*awards?|awards?\s*&?\s*honors?)[^a-z]*?([\s\S]{0,1500})/i)
  if (awardsSection && awardsSection[1]) {
    const awardsText = awardsSection[1]
      .split(/[•\-\*\n]+/)
      .map(award => award.trim())
      .filter(award => award.length > 5 && award.length < 200)
      .filter(award => !/essay|parent|family/i.test(award))
      .slice(0, 20)

    awardsText.forEach(award => {
      if (award.length > 5) {
        miscSet.add(`Award/Honor: ${award}`)
      }
    })
  }

  // Also extract standalone award mentions
  const awardPattern = /\b(award|honor|finalist|nominee|scholarship|prize|recognition|distinction)[^.\n]{0,100}/gi
  let match
  const seenAwards = new Set<string>()
  while ((match = awardPattern.exec(text)) !== null) {
    const awardText = match[0].trim()
    if (awardText.length > 10 && awardText.length < 200 && !seenAwards.has(awardText.toLowerCase())) {
      seenAwards.add(awardText.toLowerCase())
      miscSet.add(awardText)
    }
  }
}

const extractCourses = (text: string, miscSet: Set<string>) => {
  // Extract course lists
  const courseSection = text.match(/(?:courses?|curriculum|coursework|rigorous\s*courses?)[^a-z]*?([\s\S]{0,1000})/i)
  if (courseSection && courseSection[1]) {
    const coursesText = courseSection[1]
      .split(/[,;\n]+/)
      .map(course => course.trim())
      .filter(course => course.length > 3 && course.length < 100)
      .filter(course => /^(AP|Honors|IB|Advanced|College)/i.test(course))
      .slice(0, 30)

    if (coursesText.length > 0) {
      miscSet.add(`Course List: ${coursesText.join(', ')}`)
    }
  }
}

const extractAdditionalInfo = (text: string, miscSet: Set<string>) => {
  const additionalInfoMatch = text.match(/(?:additional\s*information|additional\s*info|other\s*information)[^a-z]*?([\s\S]{0,800})/i)
  if (additionalInfoMatch && additionalInfoMatch[1]) {
    const infoText = additionalInfoMatch[1]
      .split(/\n{2,}/)
      .map(block => block.trim().replace(/\s+/g, ' '))
      .filter(block => block.length > 20 && block.length < 500)
      .filter(block => !/essay|parent|family/i.test(block))
      .slice(0, 5)

    infoText.forEach(info => {
      miscSet.add(info)
    })
  }
}

const extractTestingDetails = (text: string, miscSet: Set<string>) => {
  // More specific patterns to catch SAT/ACT with detailed subscores
  const testingLinePatterns = [
    // SAT with date and subscores: "SAT (Aug 2024): 1470 (ERW 710, Math 760)"
    { regex: /SAT\s*\([^)]+\)\s*[:\-]?\s*\d{3,4}\s*\([^)]+\)/gi, prefix: 'SAT' },
    // ACT with composite and subscores: "ACT: Composite 33 (English 32, Math 34...)"
    { regex: /ACT[^\n]{0,100}?Composite\s*\d{1,2}\s*\([^)]+\)/gi, prefix: 'ACT' },
    // General SAT lines
    { regex: /SAT[^\n]{0,150}/gi, prefix: 'SAT' },
    // General ACT lines
    { regex: /ACT[^\n]{0,150}/gi, prefix: 'ACT' },
    // AP Exams with scores
    { regex: /AP\s+Exams?[^\n]{0,200}/gi, prefix: 'AP Exams' },
    // IB Exams
    { regex: /IB\s+Exams?[^\n]{0,150}/gi, prefix: 'IB Exams' },
    // PSAT
    { regex: /PSAT[^\n]{0,100}/gi, prefix: 'PSAT' }
  ]

  const seenTesting = new Set<string>()
  testingLinePatterns.forEach(({ regex, prefix }) => {
    const matches = text.match(regex)
    if (matches) {
      matches
        .map(entry => entry.trim())
        .filter(entry => {
          // Filter out very short or very long entries
          if (entry.length < 8 || entry.length > 250) return false
          // Don't add duplicates
          const key = `${prefix}:${entry.toLowerCase()}`
          if (seenTesting.has(key)) return false
          seenTesting.add(key)
          return true
        })
        .forEach(entry => {
          // Only add prefix if not already present
          const prefixed = entry.toLowerCase().startsWith(prefix.toLowerCase())
            ? entry
            : `${prefix}: ${entry}`
          miscSet.add(prefixed)
        })
    }
  })
}

const scoreFromCount = (count: number, thresholds: { ten: number; eight: number; six: number; four: number }) => {
  if (count >= thresholds.ten) return '10'
  if (count >= thresholds.eight) return '8'
  if (count >= thresholds.six) return '6'
  if (count >= thresholds.four) return '4'
  return '2'
}

const hoursToScore = (hours: number) => {
  if (hours >= 250) return '10'
  if (hours >= 150) return '8'
  if (hours >= 80) return '6'
  if (hours >= 25) return '4'
  return '2'
}

const deriveFactorInsights = (text: string) => {
  const updates: Partial<Record<ProfileField, string>> = {}
  const misc: string[] = []
  const metrics: ApplicationMetric[] = []

  const pushMetric = (metric: ApplicationMetric) => {
    metrics.push(metric)
    if (metric.field && metric.mappedValue) {
      updates[metric.field] = metric.mappedValue
    }
    if (metric.miscEntry) {
      misc.push(metric.miscEntry)
    }
  }

  // Volunteer hours / involvement
  const volunteerHoursMatch = text.match(/(\d{2,4})\s*(?:\+)?\s*(?:hours?|hrs?)[^.\n]{0,60}(?:volunteer|community|service)/i)
  if (volunteerHoursMatch) {
    const hours = parseInt(volunteerHoursMatch[1], 10)
    const mappedValue = hoursToScore(hours)
    pushMetric({
      field: 'volunteer_work',
      label: FIELD_LABELS.volunteer_work,
      rawValue: `${hours} hours`,
      mappedValue,
      miscEntry: `Volunteer Work: ${hours} hours reported`
    })
  } else {
    const volunteerMentions = (text.match(/volunteer/gi) || []).length
    if (volunteerMentions >= 2) {
      const mappedValue = scoreFromCount(volunteerMentions, { ten: 6, eight: 4, six: 3, four: 2 })
      pushMetric({
        field: 'volunteer_work',
        label: FIELD_LABELS.volunteer_work,
        rawValue: `${volunteerMentions} volunteer highlights`,
        mappedValue
      })
    }
  }

  // Activities / extracurricular depth (count bullet points and structured entries)
  const activityBullets = (text.match(/[•\-\*]/g) || []).length
  const activityNumbers = (text.match(/^\s*\d+\.\s+/gm) || []).length
  const totalActivities = activityBullets + activityNumbers
  if (totalActivities > 0) {
    const mappedValue = scoreFromCount(totalActivities, { ten: 10, eight: 7, six: 4, four: 2 })
    pushMetric({
      field: 'extracurricular_depth',
      label: FIELD_LABELS.extracurricular_depth,
      rawValue: `${totalActivities} major activities`,
      mappedValue
    })
  }

  // Leadership roles
  const leadershipCount = (text.match(/\b(president|captain|founder|lead|leader|chair|director|head|treasurer|secretary|vice\s*president)\b/gi) || []).length
  if (leadershipCount) {
    const mappedValue = scoreFromCount(leadershipCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'leadership_positions',
      label: FIELD_LABELS.leadership_positions,
      rawValue: `${leadershipCount} leadership keywords`,
      mappedValue
    })
  }

  // Awards
  const awardsCount = (text.match(/\b(award|honor|finalist|nominee|scholarship|prize|recognition|distinction)\b/gi) || []).length
  if (awardsCount) {
    const mappedValue = scoreFromCount(awardsCount, { ten: 8, eight: 5, six: 3, four: 1 })
    pushMetric({
      field: 'awards_publications',
      label: FIELD_LABELS.awards_publications,
      rawValue: `${awardsCount} award references`,
      mappedValue
    })
  }

  // Passion projects / independent initiatives
  const projectCount = (text.match(/\b(project|prototype|app|initiative|platform|independent\s*project)\b/gi) || []).length
  if (projectCount) {
    const mappedValue = scoreFromCount(projectCount, { ten: 7, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'passion_projects',
      label: FIELD_LABELS.passion_projects,
      rawValue: `${projectCount} project highlights`,
      mappedValue
    })
  }

  // Business ventures
  const businessCount = (text.match(/\b(startup|business|venture|company|nonprofit|entrepreneur)\b/gi) || []).length
  if (businessCount) {
    const mappedValue = scoreFromCount(businessCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'business_ventures',
      label: FIELD_LABELS.business_ventures,
      rawValue: `${businessCount} entrepreneurial mentions`,
      mappedValue
    })
  }

  // Research
  const researchCount = (text.match(/\b(research|lab|study|thesis|science\s*fair|institute)\b/gi) || []).length
  if (researchCount) {
    const mappedValue = scoreFromCount(researchCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'research_experience',
      label: FIELD_LABELS.research_experience,
      rawValue: `${researchCount} research references`,
      mappedValue
    })
  }

  // Portfolio / audition cues
  const portfolioCount = (text.match(/\b(portfolio|audition|performance|recital|orchestra|violin|music|arts)\b/gi) || []).length
  if (portfolioCount) {
    const mappedValue = scoreFromCount(portfolioCount, { ten: 5, eight: 3, six: 2, four: 1 })
    pushMetric({
      field: 'portfolio_audition',
      label: FIELD_LABELS.portfolio_audition,
      rawValue: `${portfolioCount} creative highlights`,
      mappedValue
    })
  }

  return { updates, misc, metrics }
}
