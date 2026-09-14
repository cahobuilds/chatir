export interface TenantBillingFields {
  billing_exempt: boolean;
  plan_status: string;
}

/**
 * True if this tenant is allowed to use billing-gated features (currently: creating new
 * agents). A tenant is either explicitly grandfathered/comped (`billing_exempt`), or has
 * an active or trialing Stripe subscription.
 */
export function hasActiveBilling(tenant: TenantBillingFields): boolean {
  if (tenant.billing_exempt) return true;
  return tenant.plan_status === 'trialing' || tenant.plan_status === 'active';
}
