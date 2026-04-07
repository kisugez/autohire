// Client-side NLP parser — detects criteria from natural language query
// and lights up the green tags in real time as the user types

export interface ParsedCriteria {
  location: string | null
  jobTitle: string | null
  experience: number | null
  industry: string | null
  skills: string[]
}

const LOCATION_PATTERNS = [
  /\bin\s+([a-z][a-z\s,]+?)(?:\s+(?:with|and|using|who|having|\d)|$)/gi,
  /\b(qatar|dubai|london|new\s*york|san\s*francisco|remote|berlin|paris|singapore|doha|riyadh|abu\s*dhabi|toronto|sydney|amsterdam)\b/gi,
]

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:experience|exp))?/gi,
  /(?:over|at\s+least|minimum)\s+(\d+)\s*(?:years?|yrs?)/gi,
]

const SKILL_KEYWORDS = [
  'python','javascript','typescript','react','node','nodejs','vue','angular',
  'java','go','golang','rust','c++','c#','dotnet','.net','ruby','php','swift',
  'kotlin','sql','postgresql','mysql','mongodb','redis','elasticsearch',
  'aws','azure','gcp','docker','kubernetes','terraform','graphql','rest',
  'django','fastapi','flask','spring','rails','laravel','next','nextjs',
  'machine learning','ml','ai','nlp','llm','pytorch','tensorflow','pandas',
  'spark','kafka','airflow','dbt','snowflake','figma','sketch',
]

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'Hospitality':   ['hotel','hospitality','tourism','travel','restaurant','food'],
  'Finance':       ['finance','banking','fintech','insurance','investment','trading'],
  'Healthcare':    ['health','medical','hospital','pharma','biotech','clinical'],
  'Technology':    ['tech','software','saas','startup','product'],
  'E-commerce':    ['ecommerce','e-commerce','retail','marketplace','shopify'],
  'Education':     ['education','edtech','learning','university','school'],
}

const JOB_TITLE_PATTERNS = [
  /\b(senior|junior|lead|staff|principal|head\s+of)?\s*(software|frontend|backend|fullstack|full[\s-]stack|data|ml|ai|devops|cloud|mobile|ios|android|product|ux|ui|design|engineering|platform|security|qa|test)\s+(engineer|developer|scientist|analyst|manager|architect|designer|lead|director)\b/gi,
  /\b(engineering|product|design|data|marketing|sales|hr|finance)\s+manager\b/gi,
  /\b(cto|ceo|cpo|vp\s+of\s+\w+)\b/gi,
]

export function parseCriteria(query: string): ParsedCriteria {
  const result: ParsedCriteria = {
    location: null,
    jobTitle: null,
    experience: null,
    industry: null,
    skills: [],
  }

  // Location
  for (const pattern of LOCATION_PATTERNS) {
    pattern.lastIndex = 0
    const m = pattern.exec(query)
    if (m) {
      result.location = (m[1] || m[0]).trim()
      break
    }
  }

  // Experience
  for (const pattern of EXPERIENCE_PATTERNS) {
    pattern.lastIndex = 0
    const m = pattern.exec(query)
    if (m) {
      result.experience = parseInt(m[1])
      break
    }
  }

  // Job title
  for (const pattern of JOB_TITLE_PATTERNS) {
    pattern.lastIndex = 0
    const m = pattern.exec(query)
    if (m) {
      result.jobTitle = m[0].trim()
      break
    }
  }

  // Skills
  const lower = query.toLowerCase()
  const foundSkills: string[] = []
  for (const skill of SKILL_KEYWORDS) {
    if (lower.includes(skill)) {
      foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1))
    }
  }
  result.skills = Array.from(new Set(foundSkills))

  // Industry
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      result.industry = industry
      break
    }
  }

  return result
}

export function getCriteriaStatus(criteria: ParsedCriteria) {
  return [
    { key: 'location',   label: 'Location',            active: !!criteria.location },
    { key: 'jobTitle',   label: 'Job Title',            active: !!criteria.jobTitle },
    { key: 'experience', label: 'Years of Experience',  active: criteria.experience !== null },
    { key: 'industry',   label: 'Industry',             active: !!criteria.industry },
    { key: 'skills',     label: 'Skills',               active: criteria.skills.length > 0 },
  ]
}
