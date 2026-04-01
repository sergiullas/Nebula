'use client';

import Link from 'next/link';
import { AIInsight } from '@/components/insightEngine';

export type ApplicationInsight = AIInsight;

type ApplicationInsightsProps = {
  insights: ApplicationInsight[];
  onAction: (insight: ApplicationInsight) => void;
};

function ApplicationInsightItem({
  insight,
  onAction,
}: {
  insight: ApplicationInsight;
  onAction: (insight: ApplicationInsight) => void;
}) {
  return (
    <article className="application-insight-item" aria-labelledby={`insight-${insight.id}`}>
      <div>
        <h3 id={`insight-${insight.id}`} className="application-insight-title">
          {insight.title}
        </h3>
        <p className="application-insight-description">{insight.description}</p>
        <p className="application-insight-why">
          <span className="application-insight-why-label">Based on:</span> {insight.why}
        </p>
      </div>
      {insight.actionType === 'navigate' && insight.actionHref ? (
        <Link
          href={insight.actionHref}
          className="application-insight-action"
          aria-label={`${insight.actionLabel} for ${insight.title}`}
        >
          {insight.actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          className="application-insight-action"
          onClick={() => onAction(insight)}
          aria-label={`${insight.actionLabel} for ${insight.title}`}
        >
          {insight.actionLabel}
        </button>
      )}
    </article>
  );
}

export function ApplicationInsights({ insights, onAction }: ApplicationInsightsProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="application-insights" aria-label="Application insights">
      <p className="application-insights-kicker">Application insights</p>
      <p className="application-insights-supporting">
        AI-generated recommendations based on your application context and governance policies.
      </p>
      <div className="application-insights-list">
        {insights.map((insight) => (
          <ApplicationInsightItem key={insight.id} insight={insight} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
