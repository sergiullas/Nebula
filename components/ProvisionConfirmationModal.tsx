import { ServiceCatalogItem } from '@/components/types';

type ProvisionConfirmationModalProps = {
  service: ServiceCatalogItem;
  applicationName: string;
  appProvider: string;
  environment: string;
  onClose: () => void;
  onConfirmApproved: () => void;
  onSubmitApproval: () => void;
  onUseAlternative: () => void;
  onProceedDiscouraged: () => void;
  alternativeName?: string;
};

export function ProvisionConfirmationModal({
  service,
  applicationName,
  appProvider,
  environment,
  onClose,
  onConfirmApproved,
  onSubmitApproval,
  onUseAlternative,
  onProceedDiscouraged,
  alternativeName,
}: ProvisionConfirmationModalProps) {
  const actionSummary = `Provision ${service.name} in ${environment} for ${applicationName}`;

  return (
    <section className="confirm-overlay" role="dialog" aria-label="Provision confirmation">
      <div className="confirm-modal">
        <h2>Confirm provisioning action</h2>
        <p>{actionSummary}</p>
        <p>
          <strong>Application:</strong> {applicationName}
        </p>
        <p>
          <strong>Provider context:</strong> {appProvider}
        </p>
        <p>
          <strong>Environment:</strong> {environment}
        </p>
        <p>
          <strong>Governance:</strong> {service.governance}
        </p>
        <p>
          <strong>Actor:</strong> Devin
        </p>

        {service.governance === 'Discouraged' && (
          <div className="discouraged-callout">
            <p>
              <strong>Why discouraged:</strong> {service.detail.governanceExplanation}
            </p>
            <p>
              <strong>Safer alternative:</strong> {alternativeName ?? 'Recommended alternative in catalog'}
            </p>
            <p>This action will be logged and reviewed by governance.</p>
          </div>
        )}

        <div className="confirm-actions">
          {service.governance === 'Approved' && (
            <button type="button" className="incident-button" onClick={onConfirmApproved}>
              Confirm
            </button>
          )}

          {service.governance === 'Requires approval' && (
            <button type="button" className="incident-button" onClick={onSubmitApproval}>
              Submit request
            </button>
          )}

          {service.governance === 'Discouraged' && (
            <>
              <button type="button" className="incident-button" onClick={onUseAlternative}>
                Use recommended alternative
              </button>
              <button type="button" className="incident-button secondary" onClick={onProceedDiscouraged}>
                Proceed anyway
              </button>
            </>
          )}

          <button type="button" className="incident-button secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
