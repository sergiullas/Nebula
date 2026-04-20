import { TemplateGovernanceState } from '@/components/types';

export type RecommendationTone = 'strong' | 'qualified' | 'caution';

export const getTone = (
  governanceState: TemplateGovernanceState,
  confidencePercent: number,
): RecommendationTone => {
  if (governanceState === 'includes-restricted') return 'caution';
  if (governanceState === 'requires-approval') return 'qualified';
  if (confidencePercent < 70) return 'qualified';
  return 'strong';
};

export const TONE_PREFIXES: Record<RecommendationTone, string[]> = {
  strong: ['Recommended for', 'Strong fit for'],
  qualified: ['Suitable for', 'Potential fit for'],
  caution: ['Relevant for', 'Could support'],
};

export const getTonePrefix = (tone: RecommendationTone, index = 0): string =>
  TONE_PREFIXES[tone][index % TONE_PREFIXES[tone].length];

export const buildCardRecommendation = (
  governanceState: TemplateGovernanceState,
  confidencePercent: number,
  aiInsightFit: string,
  appContext?: string,
): string => {
  const tone = getTone(governanceState, confidencePercent);
  const prefix = getTonePrefix(tone);

  const subject = appContext ? `your ${appContext}` : 'this workload';
  const fitSentence = aiInsightFit.split('.')[0].trim();

  if (tone === 'caution') {
    if (appContext) {
      return `${prefix} ${subject}, but it includes restricted services and may not be the safest starting point.`;
    }
    return `${prefix} this workload, but it includes restricted services and may not be the safest starting point.`;
  }

  if (tone === 'qualified' && governanceState === 'requires-approval') {
    if (appContext) {
      return `${prefix} ${subject} because ${fitSentence.charAt(0).toLowerCase() + fitSentence.slice(1)}, though some included services require approval.`;
    }
    return `${prefix} this workload because ${fitSentence.charAt(0).toLowerCase() + fitSentence.slice(1)}, though some included services require approval.`;
  }

  if (appContext) {
    return `${prefix} ${subject} because ${fitSentence.charAt(0).toLowerCase() + fitSentence.slice(1)}.`;
  }

  return `${prefix} this workload because ${fitSentence.charAt(0).toLowerCase() + fitSentence.slice(1)}.`;
};

export const buildSupportingReasons = (
  governanceState: TemplateGovernanceState,
  aiInsightFit: string,
  aiInsightCost: string,
  constraintsSummary?: string,
): string[] => {
  const reasons: string[] = [];

  reasons.push(aiInsightFit.split('.')[0].trim());

  if (governanceState === 'requires-approval') {
    reasons.push('Some included services require approval');
  } else if (governanceState === 'includes-restricted') {
    reasons.push('Includes restricted services');
  } else {
    reasons.push('Uses approved defaults where available');
  }

  if (constraintsSummary) {
    reasons.push(constraintsSummary);
  } else if (aiInsightCost) {
    reasons.push(aiInsightCost.split('.')[0].trim());
  }

  return reasons.slice(0, 3);
};
