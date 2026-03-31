export type BadgeVariant =
  | 'aws'
  | 'gcp'
  | 'healthy'
  | 'degraded'
  | 'critical'
  | 'unknown'
  | 'env'
  | 'incident';

type BadgeProps = {
  variant: BadgeVariant;
  children: React.ReactNode;
};

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
