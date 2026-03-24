import type { PlanType } from "@/types";

// ─── Billing Provider Interface ─────────────────────────────────────

export interface PlanDetails {
  id: string;
  name: PlanType;
  priceMonthly: number;
  minutesLimit: number;
  features: string[];
}

export interface SubscriptionInfo {
  id: string;
  plan: PlanType;
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface BillingProvider {
  readonly name: string;

  /**
   * Create a new customer in the billing system.
   * @param userId - Internal user ID
   * @param email - Customer email
   * @returns External customer ID
   */
  createCustomer(userId: string, email: string): Promise<string>;

  /**
   * Create a checkout session for plan subscription.
   * @param customerId - External customer ID
   * @param plan - Target plan
   * @param successUrl - Redirect URL on success
   * @param cancelUrl - Redirect URL on cancel
   * @returns Checkout session URL
   */
  createCheckoutSession(
    customerId: string,
    plan: PlanType,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string>;

  /**
   * Get the current subscription for a customer.
   */
  getSubscription(customerId: string): Promise<SubscriptionInfo | null>;

  /**
   * Cancel a subscription at period end.
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Create a billing portal session for self-serve management.
   * @returns Portal URL
   */
  createPortalSession(customerId: string, returnUrl: string): Promise<string>;

  /**
   * Check if the provider is available and properly configured.
   */
  isAvailable(): Promise<boolean>;
}
