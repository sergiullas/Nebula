import { Badge, BadgeVariant } from './Badge';
import { Provider } from './types';

type ProviderBadgeProps = {
  provider: Provider;
};

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const variant: BadgeVariant = provider === 'AWS' ? 'aws' : provider === 'GCP' ? 'gcp' : 'unknown';
  return <Badge variant={variant}>{provider}</Badge>;
}
