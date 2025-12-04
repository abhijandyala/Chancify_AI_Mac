/**
 * API service for communicating with the ML backend
 */

import { getApiBaseUrl, withNgrokHeaders } from '@/lib/config';

// Debug logging toggle (for Chrome devtools)
const DEBUG_PREDICT = process.env.NEXT_PUBLIC_DEBUG_PREDICT === 'true'

// Backend URL configuration - call getApiBaseUrl() each time to support runtime changes
// This allows the URL to be updated via localStorage or window.__CHANCIFY_API_URL__
const getAPI_BASE_URL = () => getApiBaseUrl();

// Headers for API requests
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  return withNgrokHeaders(getAPI_BASE_URL(), headers);
};

export interface PredictionRequest {
  gpa_unweighted: string;
  gpa_weighted: string;
  sat: string;
  act: string;
  rigor: string;
  extracurricular_depth: string;
  leadership_positions: string;
  awards_publications: string;
  passion_projects: string;
  business_ventures: string;
  volunteer_work: string;
  research_experience: string;
  portfolio_audition: string;
  essay_quality: string;
  recommendations: string;
  interview: string;
  demonstrated_interest: string;
  legacy_status: string;
  hs_reputation: string;
  major: string;
  college: string;
  misc?: string[];
}

export interface CollegeSuggestionsRequest {
  gpa_unweighted: string;
  gpa_weighted: string;
  sat: string;
  act: string;
  major: string;
  extracurricular_depth: string;
  leadership_positions: string;
  awards_publications: string;
  passion_projects: string;
  business_ventures: string;
  volunteer_work: string;
  research_experience: string;
  portfolio_audition: string;
  essay_quality: string;
  recommendations: string;
  interview: string;
  demonstrated_interest: string;
  legacy_status: string;
  hs_reputation: string;
  geographic_diversity: string;
  plan_timing: string;
  geography_residency: string;
  firstgen_diversity: string;
  ability_to_pay: string;
  policy_knob: string;
  conduct_record: string;
}

export interface PredictionResponse {
  success: boolean;
  college_id: string;
  college_name: string;
  probability: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  ml_probability: number;
  formula_probability: number;
  ml_confidence: number;
  blend_weights: {
    ml: number;
    formula: number;
  };
  model_used: string;
  prediction_method: string;
  explanation: string;
  category: 'reach' | 'target' | 'safety';
  acceptance_rate: number;
  selectivity_tier: string;
  error?: string;
  message?: string;
}

export interface CollegeSuggestion {
  college_id: string;
  name: string;
  probability: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  acceptance_rate: number;
  selectivity_tier: string;
  category: 'reach' | 'target' | 'safety';
  city: string;
  state: string;
  tuition_in_state: number;
  tuition_out_of_state: number;
  student_body_size: number;
}

export interface CollegeSearchResult {
  college_id: string;
  name: string;
  acceptance_rate: number;
  selectivity_tier: string;
  city: string;
  state: string;
  tuition_in_state: number;
  tuition_out_of_state: number;
  student_body_size: number;
}

export interface CollegeSuggestionsResponse {
  success: boolean;
  suggestions: CollegeSuggestion[];
  academic_score: number;
  target_tiers: string[];
  prediction_method: string;
  error?: string;
  message?: string;
}

/**
 * Get admission probability for a specific college
 */
export async function getAdmissionProbability(
  profile: PredictionRequest
): Promise<PredictionResponse> {
  try {
    const API_BASE_URL = getAPI_BASE_URL()
    if (DEBUG_PREDICT) {
      console.log('[predict] request', { profile })
    }
    const response = await fetch(`${API_BASE_URL}/api/predict/frontend`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (DEBUG_PREDICT) {
      console.log('[predict] response', { data })
    }
    return data;
  } catch (error) {
    console.error('Error getting admission probability:', error);
    return {
      success: false,
      college_id: profile.college,
      college_name: 'Unknown College',
      probability: 0,
      confidence_interval: { lower: 0, upper: 0 },
      ml_probability: 0,
      formula_probability: 0,
      ml_confidence: 0,
      blend_weights: { ml: 0, formula: 0 },
      model_used: 'error',
      prediction_method: 'error',
      explanation: 'Error occurred during prediction',
      category: 'reach',
      acceptance_rate: 0,
      selectivity_tier: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get admission probability'
    };
  }
}

/**
 * Get AI-suggested colleges based on user profile
 */
export async function getCollegeSuggestions(
  profile: CollegeSuggestionsRequest
): Promise<CollegeSuggestionsResponse> {
  try {
    const API_BASE_URL = getAPI_BASE_URL()
    const response = await fetch(`${API_BASE_URL}/api/suggest/colleges`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Backend not deployed. Please deploy the backend to Railway or run it locally.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting college suggestions:', error);
    return {
      success: false,
      suggestions: [],
      academic_score: 0,
      target_tiers: [],
      prediction_method: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get college suggestions. Backend may not be deployed.'
    };
  }
}

/**
 * Search colleges by name
 */
export async function searchColleges(query: string, limit: number = 20): Promise<{
  success: boolean;
  colleges: CollegeSearchResult[];
  total: number;
  error?: string;
  message?: string;
}> {
  try {
    const API_BASE_URL = getAPI_BASE_URL()
    const response = await fetch(`${API_BASE_URL}/api/search/colleges?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching colleges:', error);
    return {
      success: false,
      colleges: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to search colleges. Please try again.'
    };
  }
}

/**
 * Check if the ML backend is available
 */
export async function checkMLBackendStatus(): Promise<boolean> {
  try {
    const API_BASE_URL = getAPI_BASE_URL()
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Error checking backend status:', error);
    return false;
  }
}
