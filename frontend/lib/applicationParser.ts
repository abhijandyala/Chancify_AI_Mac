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

  // Improved SAT extraction
  const satPatterns = [
    /sat[^\n]{0,80}?[:\-]?\s*(\d{3,4})\b/i,
    /(\d{3,4})\s*(?:on|from|score\s*on)?\s*(?:the\s*)?sat/i,
    /\bsat\s*score[:\-]?\s*(\d{3,4})\b/i
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

  // Improved ACT extraction
  const actPatterns = [
    /act[^\n]{0,80}?[:\-]?\s*(\d{1,2})\b/i,
    /(\d{1,2})\s*(?:on|from|score\s*on)?\s*(?:the\s*)?act/i,
    /\bact\s*score[:\-]?\s*(\d{1,2})\b/i,
    /\bact\s*composite[:\-]?\s*(\d{1,2})\b/i
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

  // Derive factor insights
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

const stripExcludedSections = (text: string): string => {
  const lines = text.split('\n')
  let skipping = false
  const cleaned: string[] = []
  let skipUntilNextSection = false

  const isSectionHeading = (line: string) =>
    /^\s*\d+\.\s+/.test(line) || /^[A-Z][A-Za-z\s]{3,}(?:\:|\-)/.test(line) || /^[A-Z\s]{5,}/.test(line)

  const shouldSkipSection = (line: string) => {
    const lower = line.toLowerCase()
    return (
      /essay/i.test(lower) ||
      /personal\s+essay/i.test(lower) ||
      /supplemental\s+essay/i.test(lower) ||
      /why\s+.*university/i.test(lower) ||
      /parent/i.test(lower) ||
      /mother|father|guardian/i.test(lower) ||
      /family\s+information/i.test(lower) ||
      /family\s+background/i.test(lower)
    )
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    if (skipUntilNextSection && trimmed && isSectionHeading(trimmed) && !shouldSkipSection(trimmed)) {
      skipUntilNextSection = false
      skipping = false
      cleaned.push(line)
      return
    }

    if (!skipping && trimmed && shouldSkipSection(trimmed)) {
      skipping = true
      skipUntilNextSection = true
      return
    }

    if (skipping) {
      // Skip essay content but stop at next major section
      return
    }

    cleaned.push(line)
  })

  return cleaned.join('\n')
}

const extractStructuredSections = (text: string, miscSet: Set<string>) => {
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
