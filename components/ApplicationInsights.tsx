'use client';

import Link from 'next/link';

export type ApplicationInsight = {
  id: string;
  type?: 'cost' | 'architecture' | 'reliability' | 'governance';
  title: string;
  description?: string;
  why: string;
  actionLabel: string;
  actionType?: 'navigate' | 'modal' | 'suggest';
  actionHref?: string;
  severity?: 'low' | 'medium' | 'high';
  confidence?: number;
  source?: string;
};

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
        {insight.description ? <p className="application-insight-description">{insight.description}</p> : null}
        <p className="application-insight-why">Based on: {insight.why}</p>
      </div>
      {insight.actionType === 'navigate' && insight.actionHref ? (
        <Link href={insight.actionHref} className="application-insight-action">
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
      <div className="application-insights-list">
        {insights.map((insight) => (
          <ApplicationInsightItem key={insight.id} insight={insight} onAction={onAction} />
        ))}
      </div>
    </section>
  );
}
