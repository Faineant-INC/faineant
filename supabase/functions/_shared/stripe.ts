import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

export function stripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  // Omit apiVersion to use the SDK's pinned default (avoids version-mismatch errors).
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}
export { Stripe };
