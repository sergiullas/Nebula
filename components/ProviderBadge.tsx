import { Provider } from './types';

type ProviderBadgeProps = {
  provider: Provider;
};

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const className =
    provider === 'AWS' ? 'provider-aws' : provider === 'GCP' ? 'provider-gcp' : 'provider-internal';

  return <span className={`pill ${className}`}>{provider}</span>;
}
