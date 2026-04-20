import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

export const EXECUTION_ACTIONS = {
  ROLLBACK_DEPLOYMENT: 'ROLLBACK_DEPLOYMENT',
  PROVISION_SERVICE: 'PROVISION_SERVICE',
  USE_TEMPLATE: 'USE_TEMPLATE',
  RESTART_SERVICE: 'RESTART_SERVICE',
} as const;

export type ExecutionActionType = (typeof EXECUTION_ACTIONS)[keyof typeof EXECUTION_ACTIONS];

export const EXECUTION_ACTION_LABELS: Record<ExecutionActionType, string> = {
  ROLLBACK_DEPLOYMENT: 'Rollback deployment',
  PROVISION_SERVICE: 'Provision service',
  USE_TEMPLATE: 'Use template',
  RESTART_SERVICE: 'Restart service',
};

export type ExecutionActionPayload = {
  actionType: ExecutionActionType;
  target: string;
  appId: string;
  applicationName?: string;
  environment?: string;
  provider?: string;
  governanceState?: string;
  details?: string;
  templateName?: string;
  includedServices?: string[];
  region?: string;
  sizeTier?: string;
  impactSummary: string;
};

export type ActionExecutionResult = {
  status: 'success' | 'failure';
  message: string;
  timestamp: string;
  actionType: ExecutionActionType;
  actionLabel: string;
  target: string;
  application: string;
  appId: string;
  environment?: string;
  provider?: string;
  governanceState?: string;
  details?: string;
};

export type TemplateCreatedService = {
  id: string;
  appId: string;
  applicationName: string;
  templateName: string;
  serviceName: string;
  provider?: string;
  environment?: string;
  governanceState?: string;
  status: 'applied' | 'pending-approval';
  createdAt: string;
};

type PendingExecution = {
  payload: ExecutionActionPayload;
  onComplete?: (result: ActionExecutionResult) => void;
};

type ExecutionContextValue = {
  requestExecution: (request: PendingExecution) => void;
  recentActions: ActionExecutionResult[];
  templateCreatedServices: Record<string, TemplateCreatedService[]>;
};

const ActionExecutionContext = createContext<ExecutionContextValue | undefined>(undefined);

export function useActionExecution() {
  const context = useContext(ActionExecutionContext);
  if (!context) {
    throw new Error('useActionExecution must be used within ActionExecutionProvider');
  }
  return context;
}

const dispatcher: Record<ExecutionActionType, (payload: ExecutionActionPayload) => Pick<ActionExecutionResult, 'status' | 'message' | 'details'>> = {
  ROLLBACK_DEPLOYMENT: (payload) => ({
    status: 'success',
    message: `Rollback deployment completed for ${payload.target}.`,
  }),
  PROVISION_SERVICE: (payload) => {
    if (payload.governanceState === 'approved') {
      return { status: 'success', message: `Provision service completed for ${payload.target}.` };
    }

    if (payload.governanceState === 'requires-approval') {
      return {
        status: 'success',
        message: `Provision service request submitted for ${payload.target}.`,
        details: 'Pending platform approval.',
      };
    }

    return {
      status: 'success',
      message: `Provision service exception request submitted for ${payload.target}.`,
      details: 'Discouraged service flagged for review.',
    };
  },
  USE_TEMPLATE: (payload) => {
    const createdCount = payload.includedServices?.length ?? 0;
    const createdSummary = createdCount > 0 ? ` ${createdCount} services included.` : '';

    if (payload.governanceState === 'approved') {
      return {
        status: 'success',
        message: `Template applied successfully: ${payload.target} added to ${payload.applicationName ?? payload.appId}.${createdSummary}`,
        details: payload.includedServices?.length
          ? `Services: ${payload.includedServices.join(', ')}`
          : undefined,
      };
    }

    if (payload.governanceState === 'requires-approval') {
      return {
        status: 'success',
        message: `Template request submitted: ${payload.target} for ${payload.applicationName ?? payload.appId}.${createdSummary}`,
        details: payload.includedServices?.length
          ? `Pending approval before services are activated. Services: ${payload.includedServices.join(', ')}`
          : 'Pending approval before services are activated.',
      };
    }

    return {
      status: 'success',
      message: `Template exception submitted: ${payload.target} for ${payload.applicationName ?? payload.appId}.${createdSummary}`,
      details: payload.includedServices?.length
        ? `Contains discouraged services and requires exception review. Services: ${payload.includedServices.join(', ')}`
        : 'Contains discouraged services and requires exception review.',
    };
  },
  RESTART_SERVICE: (payload) => ({
    status: 'success',
    message: `Restart service completed for ${payload.target}.`,
  }),
};

const toTemplateServiceStatus = (governanceState?: string): TemplateCreatedService['status'] =>
  governanceState === 'approved' ? 'applied' : 'pending-approval';

export function ActionExecutionProvider({ children }: { children: ReactNode }) {
  const [pendingExecution, setPendingExecution] = useState<PendingExecution | null>(null);
  const [recentActions, setRecentActions] = useState<ActionExecutionResult[]>([]);
  const [toast, setToast] = useState<{ tone: 'success' | 'failure'; message: string } | null>(null);
  const [templateCreatedServices, setTemplateCreatedServices] = useState<Record<string, TemplateCreatedService[]>>({});

  const requestExecution = (request: PendingExecution) => setPendingExecution(request);

  const executeAction = () => {
    if (!pendingExecution) return;

    const { payload } = pendingExecution;
    const timestamp = new Date().toISOString();
    const dispatchResult = dispatcher[payload.actionType](payload);

    const result: ActionExecutionResult = {
      status: dispatchResult.status,
      message: dispatchResult.message,
      details: dispatchResult.details ?? payload.details,
      timestamp,
      actionType: payload.actionType,
      actionLabel: EXECUTION_ACTION_LABELS[payload.actionType],
      target: payload.target,
      application: payload.applicationName ?? payload.appId,
      appId: payload.appId,
      environment: payload.environment,
      provider: payload.provider,
      governanceState: payload.governanceState,
    };

    if (payload.actionType === EXECUTION_ACTIONS.USE_TEMPLATE && result.status === 'success') {
      const services = payload.includedServices ?? [];
      if (services.length > 0) {
        setTemplateCreatedServices((current) => {
          const currentAppServices = current[payload.appId] ?? [];
          const nextServices = services.map((serviceName, index) => ({
            id: `${payload.appId}-${payload.templateName ?? payload.target}-${serviceName}-${timestamp}-${index}`,
            appId: payload.appId,
            applicationName: payload.applicationName ?? payload.appId,
            templateName: payload.templateName ?? payload.target,
            serviceName,
            provider: payload.provider,
            environment: payload.environment,
            governanceState: payload.governanceState,
            status: toTemplateServiceStatus(payload.governanceState),
            createdAt: timestamp,
          }));

          return {
            ...current,
            [payload.appId]: [...nextServices, ...currentAppServices],
          };
        });
      }
    }

    setRecentActions((current) => [result, ...current].slice(0, 20));
    setToast({ tone: result.status, message: result.message });
    pendingExecution.onComplete?.(result);
    setPendingExecution(null);
    window.setTimeout(() => setToast(null), 2400);
  };

  const value = useMemo(
    () => ({ requestExecution, recentActions, templateCreatedServices }),
    [recentActions, templateCreatedServices],
  );

  return (
    <ActionExecutionContext.Provider value={value}>
      {children}

      {toast && (
        <div className={`global-toast global-toast--${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {pendingExecution && (
        <section className="confirm-overlay" role="dialog" aria-modal="true" aria-label={EXECUTION_ACTION_LABELS[pendingExecution.payload.actionType]}>
          <div className="confirm-modal">
            <h2 className="confirm-modal__title">{EXECUTION_ACTION_LABELS[pendingExecution.payload.actionType]}</h2>
            <div className="confirm-modal__meta">
              <div className="confirm-modal__meta-row">
                <span className="confirm-modal__meta-label">Action</span>
                <span className="confirm-modal__meta-value">{EXECUTION_ACTION_LABELS[pendingExecution.payload.actionType]}</span>
              </div>
              <div className="confirm-modal__meta-row">
                <span className="confirm-modal__meta-label">Target</span>
                <span className="confirm-modal__meta-value">{pendingExecution.payload.target}</span>
              </div>
              <div className="confirm-modal__meta-row">
                <span className="confirm-modal__meta-label">Application</span>
                <span className="confirm-modal__meta-value">{pendingExecution.payload.applicationName ?? pendingExecution.payload.appId}</span>
              </div>
              {pendingExecution.payload.provider && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Provider</span>
                  <span className="confirm-modal__meta-value">{pendingExecution.payload.provider}</span>
                </div>
              )}
              {pendingExecution.payload.environment && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Environment</span>
                  <span className="confirm-modal__meta-value">{pendingExecution.payload.environment}</span>
                </div>
              )}
              {pendingExecution.payload.governanceState && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Governance state</span>
                  <span className="confirm-modal__meta-value">{pendingExecution.payload.governanceState}</span>
                </div>
              )}
              {pendingExecution.payload.actionType === EXECUTION_ACTIONS.USE_TEMPLATE && pendingExecution.payload.includedServices && pendingExecution.payload.includedServices.length > 0 && (
                <div className="confirm-modal__meta-row">
                  <span className="confirm-modal__meta-label">Included services</span>
                  <span className="confirm-modal__meta-value">{pendingExecution.payload.includedServices.join(', ')}</span>
                </div>
              )}
            </div>
            <p className="confirm-modal__summary">{pendingExecution.payload.impactSummary}</p>
            {pendingExecution.payload.actionType === EXECUTION_ACTIONS.USE_TEMPLATE && pendingExecution.payload.governanceState === 'requires-approval' && (
              <p className="confirm-modal__summary">This template requires approval before services are activated.</p>
            )}
            <div className="confirm-actions">
              <button type="button" className="incident-button" onClick={executeAction}>Confirm</button>
              <button type="button" className="incident-button secondary" onClick={() => setPendingExecution(null)}>Cancel</button>
            </div>
          </div>
        </section>
      )}
    </ActionExecutionContext.Provider>
  );
}
