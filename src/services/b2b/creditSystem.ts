/**
 * B2B Pay-As-You-Go Credit System
 * Manages org-level credit balances, transactions, and package catalog.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreditLedger {
  id: string;
  organization_id: string;
  credits_balance: number;
  credits_lifetime: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  organization_id: string;
  amount: number;
  balance_after: number;
  transaction_type: "purchase" | "evaluation" | "refund" | "bonus" | "expiry";
  reference_id: string | null;
  description: string;
  performed_by: string | null;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  bonus_credits: number;
  is_active: boolean;
  sort_order: number;
}

// ─── Credit costs ───────────────────────────────────────────────────────────

export const CREDIT_COSTS = {
  cv_evaluation: 10,     // per CV evaluated by AI
  talent_search: 2,      // per vector search query
  batch_export_pdf: 5,   // per compliance PDF export
  embedding_generate: 1, // per candidate vector embedding
} as const;

// ─── Fetch org credit balance ──────────────────────────────────────────────

export async function fetchCreditBalance(orgId: string): Promise<CreditLedger | null> {
  const { data, error } = await supabase
    .from("b2b_credit_ledger")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data as CreditLedger | null;
}

// ─── Fetch credit transactions ─────────────────────────────────────────────

export async function fetchCreditTransactions(
  orgId: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from("b2b_credit_transactions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CreditTransaction[];
}

// ─── Fetch credit packages ──────────────────────────────────────────────────

export async function fetchCreditPackages(): Promise<CreditPackage[]> {
  const { data, error } = await supabase
    .from("b2b_credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as CreditPackage[];
}

// ─── Check if org has enough credits ───────────────────────────────────────

export async function hasEnoughCredits(orgId: string, required: number): Promise<boolean> {
  const ledger = await fetchCreditBalance(orgId);
  return (ledger?.credits_balance ?? 0) >= required;
}

// ─── Consume credits (client-side check before edge function call) ──────────

export async function consumeCreditsForEvaluation(
  orgId: string,
  evaluationId: string
): Promise<{ success: boolean; newBalance: number }> {
  const { data, error } = await supabase.rpc("consume_b2b_credit", {
    _org_id: orgId,
    _amount: CREDIT_COSTS.cv_evaluation,
    _reference_id: evaluationId,
    _description: "CV Evaluation — AI Matching Engine",
  });

  if (error) throw error;
  const success = data as boolean;

  const ledger = await fetchCreditBalance(orgId);
  return { success, newBalance: ledger?.credits_balance ?? 0 };
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

export function getCreditStatusColor(balance: number): string {
  if (balance >= 100) return "text-emerald-400";
  if (balance >= 30) return "text-amber-400";
  return "text-red-400";
}

export function getCreditStatusLabel(balance: number): string {
  if (balance >= 100) return "Healthy";
  if (balance >= 30) return "Low";
  if (balance > 0) return "Critical";
  return "Depleted";
}

export function formatCredits(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function estimateEvaluationsRemaining(balance: number): number {
  return Math.floor(balance / CREDIT_COSTS.cv_evaluation);
}

// ─── Trigger embedding generation after evaluation ─────────────────────────

export async function triggerEmbedding(evaluationId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/b2b-embed-candidate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ evaluation_id: evaluationId }),
  });

  if (!response.ok) {
    // Non-blocking: embedding failure should not fail the evaluation UX
    console.warn("Embedding generation failed:", await response.text());
  }
}
