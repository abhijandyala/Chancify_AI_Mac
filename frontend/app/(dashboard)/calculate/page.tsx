'use client';

import * as React from 'react';
import { Info, MapPin, TrendingUp, Zap, Target, TrendingDown, Award, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { COLLEGES } from '@/lib/colleges';
import { useCollegeSubjectEmphasis } from '@/lib/hooks/useCollegeSubjectEmphasis';
import { useCollegeTuitionByZipcode } from '@/lib/hooks/useCollegeTuitionByZipcode';
import { useImprovementAnalysis } from '@/lib/hooks/useImprovementAnalysis';
import Loader from '@/components/Loader';
import { getApiBaseUrl, withNgrokHeaders } from '@/lib/config';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const AnimatedBar = ({ value, color, label }: { value: number; color: string; label: string }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-300 font-medium">{label}</span>
        <span className="text-sm font-bold text-neutral-100">{Math.round(value)}%</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-neutral-800 to-neutral-700 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out"
          style={{
            backgroundImage: `linear-gradient(90deg, ${color}, ${color}dd)`,
            width: `${value}%`,
            boxShadow: `0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
};

// ==== Types ====
type Outcome = { accept: number; waitlist: number; reject: number };
type CostBreakdown = {
  year: number;
  inStateTuition?: number;
  outStateTuition?: number;
  fees?: number;
  roomBoard?: number;
  books?: number;
  other?: number;
};
type DistributionItem = { label: string; value: number };
type CollegeStats = {
  collegeName: string;
  city?: string;
  state?: string;
  isPublic?: boolean;
  acceptanceRateOfficial?: number;
  outcome: Outcome;
  subjects: DistributionItem[];
  ethnicity: DistributionItem[];
  costs?: CostBreakdown;
  tags?: string[];
  facts?: Record<string, string>;
  updatedAtISO?: string;
};

// ==== ROX Color Palette ====
const ROX_GOLD = '#F7B500';
const ROX_BLACK = '#0A0A0A';
const ROX_DARK_GRAY = '#1A1A1A';
const ROX_WHITE = '#FFFFFF';
const CHART_COLORS = ['#F7B500', '#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500'];

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function CircularChance({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (v: number) => {
    if (v >= 50) return ROX_GOLD;
    if (v >= 25) return '#FFD700';
    return '#FF6B6B';
  };

  const color = getColor(value);

  return (
    <div className="relative w-full flex flex-col items-center gap-6 py-8">
      <div className="relative w-40 h-40">
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ background: color }}
        />

        {/* Main circle background */}
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(247, 181, 0, 0.2)"
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            filter="drop-shadow(0 0 8px rgba(247,181,0,0.3))"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-white">
            {Math.round(value)}%
          </div>
          <div className="text-xs text-neutral-400 mt-1 text-center">Your Chance</div>
        </div>
      </div>

      <div className="text-center max-w-xs">
        <p className="text-sm text-neutral-300">
          {value >= 50
            ? '🎓 Strong shot! High probability of admission.'
            : value >= 25
            ? '⭐ Moderate chance. Competitive profile.'
            : '🎯 Long shot. Keep options open.'}
        </p>
      </div>
    </div>
  );
}

function StatRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const colors: Record<string, string> = {
    'Acceptance': ROX_GOLD,
    'Waitlist': '#FFD700',
    'Rejection': '#FF6B6B',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-300">
          <span className="font-medium">{label}</span>
          {hint && (
            <div title={hint} className="h-4 w-4 opacity-70">
              <Info className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="font-bold text-base text-neutral-100">{clampPct(value)}%</div>
      </div>
      <AnimatedBar value={value} color={colors[label] || ROX_GOLD} label="" />
    </div>
  );
}

function Money({ n }: { n?: number }) {
  if (n == null) return <span className="text-neutral-400">—</span>;
  return <span>${n.toLocaleString()}</span>;
}

function ImprovementCard({ area, current, target, impact, priority, description, actionable_steps }: {
  area: string;
  current: string;
  target: string;
  impact: number;
  priority?: string;
  description?: string;
  actionable_steps?: string[];
}) {
  const displayImpact = Math.min(Math.max(impact ?? 0, 0), 5); // cap to 5% per item to avoid overstating
  return (
    <motion.div
      className="relative group rounded-2xl bg-black border border-yellow-500/30 p-7 md:p-8 hover:border-yellow-400/60 transition-all duration-300 min-h-[420px] shadow-[0_0_0_1px_rgba(234,179,8,0.08),0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_0_1px_rgba(234,179,8,0.25),0_14px_40px_rgba(0,0,0,0.7)]"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

      <div className="relative space-y-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-white text-xl tracking-tight">{area}</h3>
              {priority && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  priority === 'high' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                  priority === 'medium' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' :
                  'bg-green-500/15 text-green-300 border-green-500/30'
                }`}>
                  {priority}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="space-y-1">
                <span className="block text-neutral-400 text-xs">Current</span>
                <span className="inline-block text-white font-semibold text-sm bg-neutral-800 px-3 py-1.5 rounded-md border border-neutral-700/60">{current}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-neutral-400 text-xs">Target</span>
                <span className="inline-block text-yellow-400 font-semibold text-sm bg-yellow-500/10 px-3 py-1.5 rounded-md border border-yellow-500/30">{target}</span>
              </div>
            </div>

            {description && (
              <p className="text-sm text-neutral-300/90 mb-1 leading-relaxed">{description}</p>
            )}
          </div>
          <div className="p-2.5 bg-yellow-500/15 rounded-lg border border-yellow-500/30">
            <Target className="h-5 w-5 text-yellow-400" />
          </div>
        </div>

        {actionable_steps && actionable_steps.length > 0 && (
          <div className="flex-1">
            <h4 className="text-xs font-semibold tracking-wide text-neutral-300 mb-2 uppercase">Action Steps</h4>
            <ul className="space-y-2.5">
              {actionable_steps.slice(0, 3).map((step, index) => (
                <li key={index} className="text-sm text-neutral-300/80 flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-yellow-500/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-400 tracking-wide uppercase">Impact</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xl font-bold text-green-400">+{displayImpact.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CalculationsPage() {
  const router = useRouter();
  const [collegeData, setCollegeData] = React.useState<CollegeStats | null>(null);
  const [userChance, setUserChance] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [collegeName, setCollegeName] = React.useState<string | null>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [zipcode, setZipcode] = React.useState<string | null>(null);

  // Get tuition data for the selected college based on zipcode
  const { tuitionData: zipcodeTuitionData, loading: zipcodeTuitionLoading, error: zipcodeTuitionError } = useCollegeTuitionByZipcode(collegeName, zipcode);

  // Get subject emphasis data for the selected college
  const { subjects: subjectEmphasis, loading: subjectsLoading, error: subjectsError } = useCollegeSubjectEmphasis(collegeName);

  // Get improvement analysis for the selected college
  // Hook automatically fetches when collegeName and userProfile become available
  const { improvementData, loading: improvementLoading, error: improvementError } = useImprovementAnalysis(collegeName, userProfile);

  // Helper: extract numeric score before '/10' (handles values like '9+/10', '7.5/10')
  const extractScore = (text: string): number | null => {
    if (!text) return null;
    const match = text.match(/([0-9]+(?:\.[0-9]+)?)(?=\s*\/?\s*10)/);
    if (match) return parseFloat(match[1]);
    const fallback = parseFloat(text.replace(/[^0-9.]/g, ''));
    return isNaN(fallback) ? null : fallback;
  };

  // Filter improvements to only those below target
  // CRITICAL: Use useMemo to ensure this recalculates when improvementData changes
  // MUST be called before any early returns (Rules of Hooks)
  const visibleImprovements = React.useMemo(() => {
    if (!improvementData?.improvements || !Array.isArray(improvementData.improvements)) {
      return [];
    }

    return improvementData.improvements.filter((imp) => {
      // Hide items explicitly marked as Target Met or with zero/negative impact
      const targetText = (imp.target || '').toLowerCase()
      const currentText = (imp.current || '').toLowerCase()
      if (imp.impact <= 0) {
        console.log('🔍 Filtering out improvement (impact <= 0):', imp.area, 'impact:', imp.impact)
        return false
      }
      if (targetText.includes('target met') || currentText.includes('target met')) {
        console.log('🔍 Filtering out improvement (target met):', imp.area)
        return false
      }

      // For numeric-like strings, compare extracted values
      const currentScore = extractScore(imp.current)
      const targetScore = extractScore(imp.target)
      if (currentScore != null && targetScore != null) {
        // If current >= target, don't show (user already meets/exceeds target)
        const shouldShow = currentScore < targetScore
        if (!shouldShow) {
          console.log('🔍 Filtering out improvement (current >= target):', imp.area, 'current:', currentScore, 'target:', targetScore)
        }
        return shouldShow
      }
      // If we cannot parse numbers, show it anyway (backend should handle filtering)
      // Only hide if we can verify current >= target
      console.log('🔍 Keeping improvement (cannot parse numbers):', imp.area, 'current:', imp.current, 'target:', imp.target)
      return true
    })
  }, [improvementData]);

  // Log filtering results
  // MUST be called before any early returns (Rules of Hooks)
  React.useEffect(() => {
    if (improvementData?.improvements) {
      console.log('🔍 Improvement filtering results:')
      console.log('  - Total improvements from backend:', improvementData.improvements.length)
      console.log('  - Visible improvements after filtering:', visibleImprovements.length)
      console.log('  - Filtered out:', improvementData.improvements.length - visibleImprovements.length)
    }
  }, [improvementData, visibleImprovements])

  // Load data from localStorage and calculate probabilities
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const selectedColleges = JSON.parse(localStorage.getItem('selectedColleges') || '[]');
        const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');

        // Set the user profile state
        setUserProfile(userProfile);

        if (selectedColleges.length === 0) {
          router.push('/college-selection');
          return;
        }

        // Get the first selected college for detailed analysis
        const firstCollege = selectedColleges[0];

        // The college ID from localStorage might be a backend ID (e.g., college_1000669)
        // We need to get the actual college name from the backend data
        // For now, we'll use the ID as-is and let the backend handle it
        const collegeName = firstCollege;

        console.log('🔍 DEBUGGING CALCULATE PAGE:');
        console.log('🔍 Selected Colleges from localStorage:', selectedColleges);
        console.log('🔍 First College ID:', firstCollege);
        console.log('🔍 College Name to send:', collegeName);
        console.log('🔍 User Profile from localStorage:', userProfile);

        // Calculate probability using the backend API
        const API_BASE_URL = getApiBaseUrl();
        const headers = withNgrokHeaders(API_BASE_URL, {
          'Content-Type': 'application/json',
        });

        const requestData = {
          ...userProfile,
          college: collegeName // Send college name instead of ID
        };

        console.log('🔍 REQUEST DATA TO BACKEND:', requestData);
        console.log('🔍 API URL:', `${API_BASE_URL}/api/predict/frontend`);

        const response = await fetch(`${API_BASE_URL}/api/predict/frontend`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('🔍 BACKEND RESPONSE DEBUG:', result);
        console.log('🔍 COLLEGE DATA FROM BACKEND:', result.college_data);
        console.log('🔍 COLLEGE NAME FROM BACKEND:', result.college_name);
        console.log('🔍 COLLEGE DATA NAME:', result.college_data?.name);
        console.log('🔍 COLLEGE ID:', result.college_id);

        // CRITICAL: Verify we have a college name from the response
        if (!result.college_name && !result.college_data?.name) {
          console.error('❌ ERROR: Backend response missing college_name!');
          console.error('  - Full result:', JSON.stringify(result, null, 2));
        }
        console.log('🔍 ACCEPTANCE RATE FROM BACKEND:', result.acceptance_rate);
        console.log('🔍 PROBABILITY FROM BACKEND:', result.probability);
        console.log('🔍 ML PROBABILITY FROM BACKEND:', result.ml_probability);
        console.log('🔍 FORMULA PROBABILITY FROM BACKEND:', result.formula_probability);
        console.log('🔍 MODEL USED FROM BACKEND:', result.model_used);
        console.log('🔍 EXPLANATION FROM BACKEND:', result.explanation);

        const probability = result.probability || 0;
        const userChancePercent = Math.round(probability * 100);
        setUserChance(userChancePercent);

        console.log('🔍 PROBABILITY CALCULATION:');
        console.log('🔍 Probability from backend:', probability);
        console.log('🔍 User chance %:', userChancePercent);
        console.log('🔍 ML Probability:', result.ml_probability);
        console.log('🔍 Formula Probability:', result.formula_probability);
        console.log('🔍 Model Used:', result.model_used);
        console.log('🔍 Explanation:', result.explanation);

        // FIXED: Calculate realistic outcome distribution
        // For elite schools like Carnegie Mellon with ~16.5% acceptance chance:
        // - Acceptance: actual probability from ML model
        // - Waitlist: ~15-20% of admits get waitlisted, so roughly 3-5% of applicants
        // - Rejection: remaining percentage
        const acceptRate = probability; // 0.0 to 1.0
        const waitlistRate = Math.min(0.10, acceptRate * 0.5); // 10% max, or half of acceptance rate
        const rejectRate = 1.0 - acceptRate - waitlistRate;

        console.log('🔍 OUTCOME CALCULATION:');
        console.log('🔍 Accept Rate:', (acceptRate * 100).toFixed(1) + '%');
        console.log('🔍 Waitlist Rate:', (waitlistRate * 100).toFixed(1) + '%');
        console.log('🔍 Reject Rate:', (rejectRate * 100).toFixed(1) + '%');

      // Set college name for subject emphasis hook - map to backend format
      // CRITICAL: Use result.college_name from backend response, not the local variable
      const backendCollegeName = result.college_name || result.college_data?.name || firstCollege || 'Selected College';

      console.log('🔍 Setting college name for improvement analysis:');
      console.log('  - result.college_name:', result.college_name);
      console.log('  - result.college_data?.name:', result.college_data?.name);
      console.log('  - firstCollege (from localStorage):', firstCollege);
      console.log('  - backendCollegeName (final):', backendCollegeName);

      // Map college names to backend format
      const collegeNameMapping: { [key: string]: string } = {
        'Carnegie Mellon University': 'Carnegie Mellon',
        'Massachusetts Institute of Technology': 'MIT',
        'University of Pennsylvania': 'Penn',
        'New York University': 'NYU'
      };

      const actualCollegeName = collegeNameMapping[backendCollegeName] || backendCollegeName;
      console.log('  - actualCollegeName (after mapping):', actualCollegeName);

      // CRITICAL: Validate college name before setting
      if (!actualCollegeName || actualCollegeName === 'Selected College' || actualCollegeName.startsWith('college_')) {
        console.error('❌ ERROR: Invalid college name detected:', actualCollegeName);
        console.error('  - This should not happen. Backend should return a valid college name.');
        console.error('  - result.college_name:', result.college_name);
        console.error('  - result.college_data?.name:', result.college_data?.name);
        console.error('  - firstCollege:', firstCollege);
        // Don't set invalid college name - improvement hook will skip anyway
      } else {
        // CRITICAL: Set college name state - hook will automatically fetch when this changes
        setCollegeName(actualCollegeName);
        console.log('✅ College name state updated to:', actualCollegeName);
      }

      // Load zipcode from localStorage
      const savedZipcode = localStorage.getItem('userZipcode');
      if (savedZipcode) {
        setZipcode(savedZipcode);
      }

        // Use real college data from backend response
         const collegeStats: CollegeStats = {
           collegeName: actualCollegeName, // Use college name from backend
           city: result.college_data?.city || 'Unknown',
           state: result.college_data?.state || 'Unknown',
           isPublic: result.college_data?.is_public || false,
           acceptanceRateOfficial: Math.round((result.acceptance_rate || 0.15) * 100),
          outcome: {
            accept: Math.round(acceptRate * 100),
            waitlist: Math.round(waitlistRate * 100),
            reject: Math.round(rejectRate * 100)
          },
          subjects: result.subject_emphasis || [
            { label: 'Computer Science', value: 28 },
            { label: 'Engineering', value: 24 },
            { label: 'Business', value: 16 },
            { label: 'Biological Sciences', value: 14 },
            { label: 'Mathematics & Stats', value: 11 },
            { label: 'Social Sciences', value: 9 },
            { label: 'Arts & Humanities', value: 7 },
            { label: 'Education', value: 5 },
          ],
          ethnicity: [
            { label: 'White', value: 36 },
            { label: 'Asian', value: 28 },
            { label: 'Hispanic/Latino', value: 18 },
            { label: 'Black/African American', value: 11 },
            { label: 'Two or More', value: 7 },
          ],
          costs: {
            year: 2025,
            inStateTuition: result.college_data?.tuition_in_state || 60849,
            outStateTuition: result.college_data?.tuition_out_of_state || 60849,
            fees: 882,
            roomBoard: 20691,
            books: 891,
            other: 2283,
          },
          tags: [
            result.college_data?.financial_aid_policy || 'Need-Blind',
            'Meets Full Need',
            result.college_data?.test_policy || 'Test-Optional'
          ],
          facts: {
            'Student-Faculty Ratio': '5:1',
            'Graduation Rate (6yr)': '97%',
            'Freshman Retention': '99%',
            'Endowment': '$38.2B',
          },
          updatedAtISO: new Date().toISOString(),
        };

        console.log('🔍 FINAL COLLEGE STATS CREATED:', collegeStats);
        console.log('🔍 COLLEGE NAME IN STATS:', collegeStats.collegeName);
        console.log('🔍 CITY IN STATS:', collegeStats.city);
        console.log('🔍 STATE IN STATS:', collegeStats.state);
        console.log('🔍 IS PUBLIC IN STATS:', collegeStats.isPublic);
        console.log('🔍 OFFICIAL ACCEPTANCE RATE IN STATS:', collegeStats.acceptanceRateOfficial + '%');
        console.log('🔍 OUTCOME BREAKDOWN:', collegeStats.outcome);
        console.log('🔍 TUITION IN STATE:', collegeStats.costs?.inStateTuition);
        console.log('🔍 TUITION OUT OF STATE:', collegeStats.costs?.outStateTuition);

        setCollegeData(collegeStats);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Compute combined impact based only on visible items, cap at 35% to mirror backend logic
  // MUST be calculated after hooks but before early returns
  const combinedVisibleImpact = React.useMemo(() => {
    const partialSum = visibleImprovements.reduce(
      (sum: number, imp: any) => sum + Math.min(Math.max(imp.impact || 0, 0), 5),
      0
    )
    return Math.min(partialSum, 5) // keep combined uplift modest
  }, [visibleImprovements])

  // Build MISC-specific evaluation with conservative contributions
  const miscEvaluations = React.useMemo(() => {
    const items: string[] = Array.isArray(userProfile?.misc) ? userProfile.misc.slice(0, 12) : []
    const rows: { item: string; feedback: string; contribution: number }[] = []
    let total = 0
    const add = (item: string, base: number, feedback: string) => {
      rows.push({ item, feedback, contribution: base })
      total += base
    }
    items.forEach((raw) => {
      const text = (raw || '').trim()
      if (!text) return
      const lower = text.toLowerCase()
      if (lower.includes('research') || lower.includes('lab') || lower.includes('published')) {
        add(text, 0.35, 'Strong research signal. Keep results concise.')
      } else if (lower.includes('intern')) {
        add(text, 0.3, 'Internship adds practical impact. Include scope and outcome.')
      } else if (lower.includes('competition') || lower.includes('olympiad') || lower.includes('contest') || lower.includes('hackathon')) {
        add(text, 0.25, 'Competition credit. Specify tier/result for clarity.')
      } else if (lower.includes('national') || lower.includes('finalist')) {
        add(text, 0.35, 'National-level distinction. Keep highlighted.')
      } else if (lower.includes('state')) {
        add(text, 0.25, 'State-level recognition. Good supporting point.')
      } else if (lower.includes('president') || lower.includes('captain') || lower.includes('director') || lower.includes('lead')) {
        add(text, 0.2, 'Leadership role noted. Add scope/impact if possible.')
      } else if (lower.includes('volunteer') || lower.includes('service') || lower.includes('outreach')) {
        add(text, 0.15, 'Service contribution. Quantify hours/impact for clarity.')
      } else if (lower.includes('summer program') || lower.includes('institute') || lower.includes('fellowship')) {
        add(text, 0.2, 'Summer program adds rigor. Mention selectivity/outputs.')
      } else if (lower.includes('job') || lower.includes('work') || lower.includes('employment') || lower.includes('cashier') || lower.includes('barista')) {
        add(text, 0.15, 'Work experience shows responsibility. Include hours/role.')
      } else if (lower.includes('startup') || lower.includes('founder') || lower.includes('venture') || lower.includes('project')) {
        add(text, 0.2, 'Project/venture noted. Outcomes/traction strengthen it.')
      } else {
        add(text, 0.08, 'Good highlight. Keep concise and outcome-focused.')
      }
    })
    const cap = 1.2
    if (total > cap) {
      const scale = cap / total
      return rows.map((r) => ({ ...r, contribution: parseFloat((r.contribution * scale).toFixed(3)) }))
    }
    return rows.map((r) => ({ ...r, contribution: parseFloat(r.contribution.toFixed(3)) }))
  }, [userProfile?.misc])

  // Early returns - MUST come after all hooks
  if (isLoading) {
    return <Loader message="Calculating your chances..." />;
  }

  if (!collegeData) {
    return (
      <div className="min-h-screen bg-ROX_BLACK flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">No college data available</p>
          <button
            onClick={() => router.push('/college-selection')}
            className="px-6 py-2 bg-ROX_GOLD text-black rounded-lg font-semibold hover:bg-ROX_GOLD/80 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const d = collegeData;
  const cityState = [d.city, d.state].filter(Boolean).join(', ');
  const outcomeRows = [
    { key: 'Acceptance', value: d.outcome.accept, hint: 'Probability of admission based on similar profiles.' },
    { key: 'Waitlist', value: d.outcome.waitlist, hint: 'Chance of being placed on a waitlist.' },
    { key: 'Rejection', value: d.outcome.reject, hint: 'Probability of not receiving an offer.' },
  ];

  const outcomeChartData = [
    { label: 'Acceptance', pct: clampPct(d.outcome.accept) },
    { label: 'Waitlist', pct: clampPct(d.outcome.waitlist) },
    { label: 'Rejection', pct: clampPct(d.outcome.reject) },
  ];

  const baseInStateTuition = d.costs?.inStateTuition ?? 0;
  const baseOutStateTuition = d.costs?.outStateTuition ?? baseInStateTuition;

  const displayInStateTuition = zipcodeTuitionData?.success
    ? zipcodeTuitionData.in_state_tuition ??
      (zipcodeTuitionData.is_in_state ? zipcodeTuitionData.tuition : baseOutStateTuition)
    : baseInStateTuition;

  const displayOutStateTuition = zipcodeTuitionData?.success
    ? zipcodeTuitionData.out_state_tuition ??
      (!zipcodeTuitionData.is_in_state ? zipcodeTuitionData.tuition : baseInStateTuition)
    : baseOutStateTuition;

  const tuitionBars = [
    ...(displayInStateTuition
      ? [{ label: 'In-State Tuition', amount: displayInStateTuition }]
      : []),
    ...(displayOutStateTuition
      ? [{ label: 'Out-of-State Tuition', amount: displayOutStateTuition }]
      : []),
  ];

  const feesAmount = d.costs?.fees ?? 1000;
  const roomBoardAmount = d.costs?.roomBoard ?? 15000;
  const booksAmount = d.costs?.books ?? 1000;
  const otherAmount = d.costs?.other ?? 2000;

  const zipcodeTuitionSuccess = Boolean(zipcodeTuitionData?.success);
  const zipcodeTuitionValue = zipcodeTuitionSuccess ? zipcodeTuitionData?.tuition : undefined;
  const hasZipcodeTuitionNumber =
    typeof zipcodeTuitionValue === 'number' && !Number.isNaN(zipcodeTuitionValue);
  const resolvedZipcodeState = zipcodeTuitionSuccess ? zipcodeTuitionData?.is_in_state : null;

  const tuitionFallbackByState =
    resolvedZipcodeState === true
      ? displayInStateTuition
      : resolvedZipcodeState === false
        ? displayOutStateTuition
        : (displayOutStateTuition ?? displayInStateTuition);

  const tuitionLineAmount = hasZipcodeTuitionNumber
    ? (zipcodeTuitionValue as number)
    : (tuitionFallbackByState ?? 0);

  const totalCost =
    tuitionLineAmount +
    feesAmount +
    roomBoardAmount +
    booksAmount +
    otherAmount;

  // Comprehensive improvement areas - NO FALLBACK, force API data
  const improvementAreas = improvementData?.improvements || [];

  return (
    <div className="min-h-screen bg-ROX_BLACK text-white pt-20 relative overflow-hidden">
      {/* ROX Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-ROX_GOLD/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-gradient-to-tr from-ROX_GOLD/3 via-transparent to-transparent rounded-full blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Header */}
        <motion.div
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-ROX_GOLD hover:text-ROX_GOLD/80 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">{d.collegeName}</h1>
              {d.acceptanceRateOfficial != null && (
                <div className="px-3 py-1 rounded-full bg-ROX_DARK_GRAY text-ROX_GOLD border border-ROX_GOLD/30 text-xs md:text-sm font-medium">
                  Official Acceptance: {d.acceptanceRateOfficial.toFixed(1)}%
                </div>
              )}
              {d.isPublic != null && (
                <div className="px-3 py-1 rounded-full bg-ROX_GOLD text-black text-xs md:text-sm font-medium">
                  {d.isPublic ? 'Public' : 'Private'}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
              <MapPin className="h-4 w-4" />
              <span>{cityState || 'Location N/A'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(d.tags || []).map((t) => (
              <div key={t} className="px-3 py-1 rounded-full border border-ROX_GOLD/30 text-ROX_GOLD text-xs md:text-sm">
                {t}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Warning */}
        <motion.div
          className="bg-ROX_DARK_GRAY border border-ROX_GOLD/30 rounded-2xl p-4 flex gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Info className="h-5 w-5 text-ROX_GOLD flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-white">Model-Estimated Probabilities</div>
            <div className="text-neutral-300 text-sm mt-1">
              These percentages are generated by a statistical/ML model using your provided profile. They are estimates—not admissions advice or guarantees.
            </div>
          </div>
        </motion.div>

        <div className="h-px bg-gradient-to-r from-transparent via-ROX_GOLD/30 to-transparent my-6" />

        {/* Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Column - Expanded */}
          <div className="lg:col-span-9 space-y-6">
            {/* Outcome Distribution */}
            <motion.div
              className="relative bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/60 to-ROX_BLACK/80 border border-ROX_GOLD/30 rounded-3xl p-6 backdrop-blur-xl overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ROX_GOLD/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-6">
                  <TrendingUp className="h-5 w-5 text-ROX_GOLD" /> Outcome Distribution
                </h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outcomeChartData}>
                      <XAxis dataKey="label" stroke="#9CA3AF" tickLine={false} axisLine={{ stroke: '#1F2937' }} />
                      <YAxis stroke="#9CA3AF" tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={{ stroke: '#1F2937' }} domain={[0, 100]} />
                      <RTooltip contentStyle={{ background: ROX_BLACK, border: '1px solid #F7B500', color: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.3)' }} formatter={(v: number) => [`${v}%`, 'Probability']} />
                      <Bar dataKey="pct" radius={[12, 12, 0, 0]}>
                        {outcomeChartData.map((_, i) => (
                          <Cell key={i} fill={[ROX_GOLD, "#FFD700", "#FF6B6B"][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* Subjects Chart */}
            <motion.div
              className="relative bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/60 to-ROX_BLACK/80 border border-ROX_GOLD/30 rounded-3xl p-6 backdrop-blur-xl overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ROX_GOLD/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-6">
                  Subject Emphasis
                  {subjectsLoading && <span className="text-sm text-gray-400 ml-2">(Loading...)</span>}
                  {subjectsError && <span className="text-sm text-red-400 ml-2">(Using default data)</span>}
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectEmphasis.length > 0 ? subjectEmphasis : d.subjects} layout="vertical" margin={{ left: 140 }}>
                      <XAxis type="number" stroke="#9CA3AF" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                      <YAxis type="category" dataKey="label" width={130} stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <RTooltip contentStyle={{ background: ROX_BLACK, border: '1px solid #F7B500', color: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.3)' }} formatter={(v: number) => [`${v}%`, 'Share']} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                        {(subjectEmphasis.length > 0 ? subjectEmphasis : d.subjects).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>


            {/* Tuition */}
            <motion.div
              className="relative bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/60 to-ROX_BLACK/80 border border-ROX_GOLD/30 rounded-3xl p-6 backdrop-blur-xl overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ROX_GOLD/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
          <h2 className="text-lg font-semibold text-white mb-6">
            Tuition & Annual Costs (2025)
            {zipcodeTuitionLoading && <span className="text-sm text-gray-400 ml-2">(Loading...)</span>}
            {zipcodeTuitionError && <span className="text-sm text-red-400 ml-2">(Using default data)</span>}
            {zipcodeTuitionData && (
              <span className="text-sm text-yellow-400 ml-2">
                ({zipcodeTuitionData.is_in_state ? 'In-State' : 'Out-of-State'} - {zipcodeTuitionData.zipcode_state || 'Unknown State'})
              </span>
            )}
          </h2>
                <div className="space-y-6">
                {tuitionBars.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tuitionBars.map((t) => (
                      <div key={t.label} className="p-4 rounded-2xl bg-ROX_DARK_GRAY border border-ROX_GOLD/20">
                        <div className="text-sm text-neutral-400">{t.label}</div>
                        <div className="text-2xl font-semibold mt-1 text-white"><Money n={t.amount} /></div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-ROX_GOLD/20">
                  <table className="w-full text-sm">
                    <thead className="bg-ROX_DARK_GRAY/60 text-neutral-300 border-b border-ROX_GOLD/20">
                      <tr>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Estimated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ROX_GOLD/20">
                      <tr>
                        <td className="p-3 text-white">
                          Tuition {zipcodeTuitionData && zipcodeTuitionData.success && (
                            <span className="text-xs text-yellow-400 ml-1">
                              ({zipcodeTuitionData.is_in_state ? 'In-State' : 'Out-of-State'})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-white">
                          <Money n={tuitionLineAmount} />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-white">Fees</td>
                        <td className="p-3 text-right text-white"><Money n={feesAmount} /></td>
                      </tr>
                      <tr>
                        <td className="p-3 text-white">Room & Board</td>
                        <td className="p-3 text-right text-white"><Money n={roomBoardAmount} /></td>
                      </tr>
                      <tr>
                        <td className="p-3 text-white">Books</td>
                        <td className="p-3 text-right text-white"><Money n={booksAmount} /></td>
                      </tr>
                      <tr>
                        <td className="p-3 text-white">Other</td>
                        <td className="p-3 text-right text-white"><Money n={otherAmount} /></td>
                      </tr>
                      <tr className="border-t border-ROX_GOLD/30 bg-ROX_DARK_GRAY/40">
                        <td className="p-3 text-white font-semibold">Total</td>
                        <td className="p-3 text-right text-white font-semibold">
                          <Money n={totalCost} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-neutral-500">Numbers are approximate and may vary by program, living situation, and aid.</p>
              </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Reduced */}
          <div className="lg:col-span-3 lg:sticky lg:top-24 h-fit space-y-6">
            {/* Your Chance Card */}
            <motion.div
              className="relative bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/60 to-ROX_BLACK/80 border border-ROX_GOLD/30 rounded-3xl p-8 backdrop-blur-xl overflow-hidden group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ROX_GOLD/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute -inset-1 bg-gradient-to-r from-ROX_GOLD/20 via-transparent to-ROX_GOLD/20 rounded-3xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-ROX_GOLD" />
                  <h2 className="text-lg font-semibold text-white">Your Admission Chance</h2>
                </div>
                <CircularChance value={userChance} />
              </div>
            </motion.div>


            {/* Outcome Snapshot Card */}
            <motion.div
              className="relative bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/60 to-ROX_BLACK/80 border border-ROX_GOLD/30 rounded-3xl p-6 backdrop-blur-xl overflow-hidden group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ROX_GOLD/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <h2 className="text-lg font-semibold text-white mb-5">Outcome Breakdown</h2>
                <div className="space-y-5">
                  {outcomeRows.map((r) => (
                    <StatRow key={r.key} label={r.key} value={r.value} hint={r.hint} />
                  ))}
                </div>
              </div>
            </motion.div>


            {d.updatedAtISO && (
              <p className="text-xs text-neutral-500 px-2">Last updated: {new Date(d.updatedAtISO).toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Areas to Improve - Professional Design - Full Width */}
        <div className="mt-12 -mx-4 md:-mx-8 px-6">
          <motion.div
            className="relative bg-black border border-yellow-500/30 rounded-3xl p-8 backdrop-blur-xl overflow-hidden group w-full shadow-[0_0_0_1px_rgba(234,179,8,0.08),0_20px_60px_rgba(0,0,0,0.7)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-yellow-500/15 rounded-xl border border-yellow-500/30">
                    <Award className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold text-white mb-1 tracking-tight">Areas to Improve</h2>
                    <p className="text-sm text-neutral-400">Focused recommendations to raise your chances</p>
                  </div>
                </div>

                {/* Debug panel removed for production */}
                {improvementLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                      <span className="text-yellow-400 text-lg">Analyzing improvement areas...</span>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {improvementError && !improvementLoading && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-red-400 font-semibold">Failed to load improvement analysis</p>
                        <p className="text-red-300 text-sm mt-1">{improvementError}</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State - Show Real Data - Only show if we have actual improvement data */}
                {/* CRITICAL: Use direct conditional rendering, not IIFE, to ensure React properly tracks state changes */}
                {improvementData &&
                 improvementData.improvements &&
                 Array.isArray(improvementData.improvements) &&
                 improvementData.improvements.length > 0 &&
                 !improvementLoading && (
                  <>
                    {visibleImprovements.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl-grid-cols-3 gap-6">
                          {visibleImprovements.map((improvement) => (
                            <ImprovementCard
                              key={improvement.area}
                              area={improvement.area}
                              current={improvement.current}
                              target={improvement.target}
                              impact={improvement.impact}
                              priority={improvement.priority}
                              description={improvement.description}
                              actionable_steps={improvement.actionable_steps}
                            />
                          ))}
                        </div>

                        <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                              <TrendingUp className="h-6 w-6 text-yellow-400" />
                            </div>
                            <div>
                              <p className="font-bold text-yellow-400 text-xl mb-1">Combined Improvement Potential</p>
                              <p className="text-white text-lg">By improving all areas above, you could increase your chances by <span className="font-bold text-yellow-400 text-2xl">+{combinedVisibleImpact}%</span></p>
                            </div>
                          </div>
                        </div>

                        {miscEvaluations.length > 0 && (
                          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-ROX_DARK_GRAY/80 via-ROX_BLACK/70 to-ROX_BLACK/80 border border-ROX_GOLD/30 shadow-[0_0_0_1px_rgba(234,179,8,0.08),0_14px_40px_rgba(0,0,0,0.6)]">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="p-2 bg-yellow-500/15 rounded-lg border border-yellow-500/30">
                                <Info className="h-5 w-5 text-yellow-300" />
                              </div>
                              <div>
                                <p className="font-bold text-white text-xl">Specific Evaluation</p>
                                <p className="text-sm text-neutral-300/80">Key MISC highlights with conservative contribution estimates.</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {miscEvaluations.map((row, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3"
                                >
                                  <div className="mt-1 h-2 w-2 rounded-full bg-yellow-300" />
                                  <div className="flex-1">
                                    <p className="text-sm text-white">{row.item}</p>
                                    <p className="text-xs text-neutral-300/80">{row.feedback}</p>
                                  </div>
                                  <div className="text-xs font-semibold text-yellow-300 whitespace-nowrap">+{row.contribution.toFixed(2)}%</div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 text-xs text-neutral-400">
                              Total MISC lift is capped and conservative to match other evaluations.
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="mb-6">
                          <Award className="h-16 w-16 text-yellow-400 mx-auto" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                          You've Exceeded Our Expectations
                        </h3>
                        <p className="text-lg text-neutral-300 max-w-2xl mb-2">
                          This is the best of the best you can get. Keep reaching for more, but on our part, you have exceeded our expectations.
                        </p>
                        <p className="text-base text-neutral-400 max-w-2xl">
                          Your profile demonstrates exceptional strength across all areas. Continue maintaining this excellence as you pursue your college goals.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* No Data State - Only show if we truly have no data AND not loading AND no error */}
                {/* CRITICAL: Make sure this doesn't conflict with Success State by checking improvementData.improvements explicitly */}
                {!improvementLoading &&
                 !improvementError &&
                 (!improvementData || !improvementData.improvements || !Array.isArray(improvementData.improvements) || improvementData.improvements.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="mb-4">
                        <Info className="h-12 w-12 text-yellow-400 mx-auto" />
                      </div>
                      <p className="text-lg text-neutral-300 mb-2">
                        Improvement analysis will appear here once you select a college and complete your profile.
                      </p>
                      <p className="text-sm text-neutral-400">
                        Please ensure you've selected a college and filled in your academic information.
                      </p>
                    </div>
                )}
              </div>
            </motion.div>
        </div>

        {/* Footer Meta */}
        <motion.div
          className="mt-8 text-xs text-neutral-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          Chancify estimates are based on statistical patterns in historical data and self-reported inputs. They do not account for subjective review factors and are not a guarantee of outcome.
        </motion.div>
      </div>
    </div>
  );
}
