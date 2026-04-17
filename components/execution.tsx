import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

export const ACTION_LABELS = {
  rollbackDeployment: 'Rollback deployment',
  triggerDeployment: 'Trigger deployment',
  switchEnvironment: 'Switch environment',
  provisionEnvironment: 'Provision environment',
  jumpToLogsMetrics: 'Jump to logs & metrics',
  openAiCompanion: 'Open AI companion',
  navigateApplication: 'Navigate to application',
  provisionService: 'Provision service',
  useTemplate: 'Use template',
  restartService: 'Restart service',
} as const;

export type ActionLabel = (typeof ACTION_LABELS)[keyof typeof ACTION_LABELS];
export type ActionSource = 'palette' | 'workspace' | 'service' | 'template';

export type ActionExecutionResult = {
  status: 'success' | 'failure';
  message: string;
  timestamp: string;
  actionType: ActionLabel;
  source: ActionSource;
  target?: string;
  details?: string;
  appId?: string;
  provider?: string;
  environment?: string;
  governanceState?: string;
};

type ActionRequest = {
  actionType: ActionLabel;
  source: ActionSource;
  target?: string;
  appId?: string;
  provider?: string;
  environment?: string;
  governanceState?: string;
  details?: string;
  confirmationTitle?: string;
  impactSummary: string;
  governanceSignal?: string;
  confirmLabel?: string;
  onExecute?: () => Promise<Partial<ActionExecutionResult>> | Partial<ActionExecutionResult>;
  onComplete?: (result: ActionExecutionResult) => void;
};

type ExecutionContextValue = {
  requestAction: (request: ActionRequest) => void;
  recentActions: ActionExecutionResult[];
};

const ActionExecutionContext = createContext<ExecutionContextValue | undefined>(undefined);

export function useActionExecution() {
  const context = useContext(ActionExecutionContext);
  if (!context) {
    throw new Error('useActionExecution must be used within ActionExecutionProvider');
  }
  return context;
}

export function ActionExecutionProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<ActionRequest | null>(null);
  const [recentActions, setRecentActions] = useState<ActionExecutionResult[]>([]);
  const [toast, setToast] = useState<{ tone: 'success' | 'failure'; message: string } | null>(null);

  const requestAction = (request: ActionRequest) => {
    setPendingAction(request);
  };

  const executePendingAction = async () => {
    if (!pendingAction) {
      return;
    }

    const timestamp = new Date().toISOString();
    const baseResult: ActionExecutionResult = {
      status: 'success',
      message: `${pendingAction.actionType} completed.`,
      timestamp,
      actionType: pendingAction.actionType,
      source: pendingAction.source,
      target: pendingAction.target,
      details: pendingAction.details,
      appId: pendingAction.appId,
      provider: pendingAction.provider,
      environment: pendingAction.environment,
      governanceState: pendingAction.governanceState,
    };

    let result = baseResult;

    try {
      const custom = pendingAction.onExecute ? await pendingAction.onExecute() : {};
      result = { ...baseResult, ...custom, timestamp, actionType: pendingAction.actionType, source: pendingAction.source };
    } catch (error) {
      result = {
        ...baseResult,
        status: 'failure',
        message: error instanceof Error ? error.message : `${pendingAction.actionType} failed.`,
      };
    }

    setRecentActions((current) => [result, ...current].slice(0, 20));
    setToast({ tone: result.status, message: result.message });
    pendingAction.onComplete?.(result);
    setPendingAction(null);
    window.setTimeout(() => setToast(null), 2400);
  };

  const value = useMemo(() => ({ requestAction, recentActions }), [recentActions]);

  return (
    <ActionExecutionContext.Provider value={value}>
      {children}

      {toast && (
        <div className={`global-toast global-toast--${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {pendingAction && (
        <section className="confirm-overlay" role="dialog" aria-modal="true" aria-label={pendingAction.confirmationTitle ?? pendingAction.actionType}>
          <div className="confirm-modal">
            <h2 className="confirm-modal__title">{pendingAction.confirmationTitle ?? pendingAction.actionType}</h2>
            <p className="confirm-modal__summary">{pendingAction.impactSummary}</p>
            <div className="confirm-modal__meta">
              <div className="confirm-modal__meta-row">
                <span className="confirm-modal__meta-label">Application</span>
                <span className="confirm-modal__meta-value">{pendingAction.target ?? 'No target selected'}</span>
              </div>
              <div className="confirm-modal__meta-row">
                <span className="confirm-modal__meta-label">Source</span>
                <span className="confirm-modal__meta-value">{pendingAction.source}</span>
              </div>
              {pendingAction.environment && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Environment</span>
                  <span className="confirm-modal__meta-value">{pendingAction.environment}</span>
                </div>
              )}
              {pendingAction.governanceSignal && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Governance</span>
                  <span className="confirm-modal__meta-value">{pendingAction.governanceSignal}</span>
                </div>
              )}
            </div>
            <div className="confirm-actions">
              <button type="button" className="incident-button" onClick={executePendingAction}>
                {pendingAction.confirmLabel ?? 'Confirm'}
              </button>
              <button type="button" className="incident-button secondary" onClick={() => setPendingAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </ActionExecutionContext.Provider>
  );
}
