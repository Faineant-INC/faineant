import { stripeClient } from "../_shared/stripe.ts";
import { getCaller, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  let caller; try { caller = await getCaller(req); } catch (r) { return r as Response; }
  if (caller.role !== "PROVIDER") {
    return new Response(JSON.stringify({ error: "FORBIDDEN: provider only" }), { status: 403 });
  }
  const db = serviceClient();
  try {
    const { data: profile } = await db.from("provider_profiles")
      .select("id, stripe_account_id").eq("user_id", caller.userId).single();
    if (!profile) return new Response(JSON.stringify({ error: "Provider profile not found" }), { status: 404 });
    const p = profile as Record<string, unknown>;
    const stripe = stripeClient();
    const webUrl = Deno.env.get("WEB_URL") ?? "https://faineantapp.com";
    let accountId = (p.stripe_account_id as string | null) ?? null;
    if (!accountId) {
      const { data: userRes } = await db.auth.admin.getUserById(caller.userId);
      const email = userRes?.user?.email ?? undefined;
      const account = await stripe.accounts.create({
        type: "express", email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;
      await db.from("provider_profiles").update({ stripe_account_id: accountId }).eq("user_id", caller.userId);
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${webUrl}/dashboard/provider/earnings?stripe=refresh`,
      return_url: `${webUrl}/dashboard/provider/earnings?stripe=complete`,
      type: "account_onboarding",
    });
    return new Response(JSON.stringify({ url: link.url }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
});
