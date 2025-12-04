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

export const parseApplicationData = (rawText: string): ParsedApplicationData => {
  const text = stripEssaySections(rawText.replace(/\r/g, '\n'))
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

  const matchNumber = (regex: RegExp) => {
    const match = text.match(regex)
    return match ? match[1] : undefined
  }

  const matchNumberLast = (regex: RegExp) => {
    const matches = Array.from(text.matchAll(regex))
    if (!matches.length) return undefined
    return matches[matches.length - 1][1]
  }

  const weightedGpa = matchNumber(/weighted\s*gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
  if (weightedGpa) {
    recordMetric('gpa_weighted', `${weightedGpa}`, weightedGpa)
  }

  const unweightedGpa = matchNumber(/unweighted\s*gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
  if (unweightedGpa) {
    recordMetric('gpa_unweighted', `${unweightedGpa}`, unweightedGpa)
  } else if (!updates.gpa_unweighted) {
    const generalGpa = matchNumber(/gpa[^0-9]{0,10}(\d\.\d{1,2})/i)
    if (generalGpa) {
      recordMetric('gpa_unweighted', `${generalGpa}`, generalGpa)
    }
  }

  const satScore =
    matchNumber(/sat[^\n]{0,80}?:\s*(\d{3,4})/i) ??
    matchNumberLast(/sat[^\d]{0,30}(\d{3,4})/gi)
  if (satScore) {
    recordMetric('sat', `${satScore}`, satScore)
  }

  const actScore =
    matchNumber(/act[^\n]{0,80}?:\s*(\d{1,2})/i) ??
    matchNumberLast(/act[^\d]{0,20}(\d{1,2})/gi)
  if (actScore) {
    recordMetric('act', `${actScore}`, actScore)
  }

  const apCourses = matchNumber(/(?:ap|advanced placement)[^0-9]{0,12}(\d{1,2})/i)
  if (apCourses) {
    recordMetric('ap_count', `${apCourses}`, apCourses)
  }

  const honorsCourses = matchNumber(/honors (?:courses|classes)[^0-9]{0,12}(\d{1,2})/i)
  if (honorsCourses) {
    recordMetric('honors_count', `${honorsCourses}`, honorsCourses)
  }

  const classRank = matchNumber(/class rank[^0-9%]{0,12}(\d{1,2})\s*%/i)
  if (classRank) {
    recordMetric('class_rank_percentile', `${classRank}%`, classRank)
  }

  const classSize =
    matchNumber(/(?:class size|class of|students in (?:my )?class)[^0-9]{0,12}(\d{2,4})/i) ||
    matchNumber(/cohort of (\d{2,4})/i)
  if (classSize) {
    recordMetric('class_size', `${classSize}`, classSize)
  }

  extractMiscCandidates(text).forEach(entry => miscSet.add(entry))

  const derived = deriveFactorInsights(text)
  Object.assign(updates, derived.updates)
  derived.misc.forEach(entry => miscSet.add(entry))
  metrics.push(...derived.metrics)

  return {
    updates,
    misc: Array.from(miscSet),
    metrics
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

const stripEssaySections = (text: string) => {
  const lines = text.split('\n')
  let skipping = false
  const cleaned: string[] = []

  const isSectionHeading = (line: string) =>
    /^\s*\d+\.\s+/.test(line) || /^[A-Z][A-Za-z\s]+(?:\:|\-)/.test(line)

  const isEssayHeading = (line: string) => /essay/i.test(line)

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!skipping && trimmed && isEssayHeading(trimmed)) {
      skipping = true
      return
    }

    if (skipping) {
      if (trimmed && isSectionHeading(trimmed) && !isEssayHeading(trimmed)) {
        skipping = false
        cleaned.push(line)
      }
      return
    }

    cleaned.push(line)
  })

  return cleaned.join('\n')
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

  const volunteerHoursMatch = text.match(/(\d{2,4})\s*(?:\+)?\s*(?:hours|hrs)[^.\n]{0,60}(?:volunteer|community)/i)
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

  const activityBullets = (text.match(/•/g) || []).length || (text.match(/\n-\s/g) || []).length
  if (activityBullets > 0) {
    const mappedValue = scoreFromCount(activityBullets, { ten: 10, eight: 7, six: 4, four: 2 })
    pushMetric({
      field: 'extracurricular_depth',
      label: FIELD_LABELS.extracurricular_depth,
      rawValue: `${activityBullets} major activities`,
      mappedValue
    })
  }

  const leadershipCount = (text.match(/\b(president|captain|founder|lead|leader|chair|director|head)\b/gi) || []).length
  if (leadershipCount) {
    const mappedValue = scoreFromCount(leadershipCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'leadership_positions',
      label: FIELD_LABELS.leadership_positions,
      rawValue: `${leadershipCount} leadership keywords`,
      mappedValue
    })
  }

  const awardsCount = (text.match(/\b(award|honor|finalist|nominee|scholarship|prize)\b/gi) || []).length
  if (awardsCount) {
    const mappedValue = scoreFromCount(awardsCount, { ten: 8, eight: 5, six: 3, four: 1 })
    pushMetric({
      field: 'awards_publications',
      label: FIELD_LABELS.awards_publications,
      rawValue: `${awardsCount} award references`,
      mappedValue
    })
  }

  const projectCount = (text.match(/\b(project|prototype|app|initiative|platform)\b/gi) || []).length
  if (projectCount) {
    const mappedValue = scoreFromCount(projectCount, { ten: 7, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'passion_projects',
      label: FIELD_LABELS.passion_projects,
      rawValue: `${projectCount} project highlights`,
      mappedValue
    })
  }

  const businessCount = (text.match(/\b(startup|business|venture|company|nonprofit)\b/gi) || []).length
  if (businessCount) {
    const mappedValue = scoreFromCount(businessCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'business_ventures',
      label: FIELD_LABELS.business_ventures,
      rawValue: `${businessCount} entrepreneurial mentions`,
      mappedValue
    })
  }

  const researchCount = (text.match(/\b(research|lab|study|thesis|science fair)\b/gi) || []).length
  if (researchCount) {
    const mappedValue = scoreFromCount(researchCount, { ten: 6, eight: 4, six: 2, four: 1 })
    pushMetric({
      field: 'research_experience',
      label: FIELD_LABELS.research_experience,
      rawValue: `${researchCount} research references`,
      mappedValue
    })
  }

  const portfolioCount = (text.match(/\b(portfolio|audition|performance|recital|orchestra)\b/gi) || []).length
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

