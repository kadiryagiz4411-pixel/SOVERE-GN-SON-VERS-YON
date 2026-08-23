export const COST_PER_ACTION = 20;

export const INSUFFICIENT_CREDITS_MESSAGE =
  `Insufficient credits. Required: ${COST_PER_ACTION}`;

export async function getCreditBalance(
  supabase: { from: Function },
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("credits_balance")
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.error("[credits] failed to read balance", error);
  }

  return Number((data as { credits_balance?: number } | null)?.credits_balance ?? 0);
}

export async function assertActionCredits(
  supabase: { from: Function },
  userId: string,
): Promise<{ ok: true; balance: number } | { ok: false; balance: number }> {
  const balance = await getCreditBalance(supabase, userId);
  if (balance < COST_PER_ACTION) {
    console.warn(`[credits] insufficient for ${userId}: ${balance} < ${COST_PER_ACTION}`);
    return { ok: false, balance };
  }
  return { ok: true, balance };
}

/**
 * Deduct COST_PER_ACTION only after a successful generation.
 * Never call this on a failed LLM response.
 */
export async function deductActionCredits(
  supabase: { rpc: Function },
  userId: string,
  referenceType: string,
): Promise<number | null> {
  const { data, error } = await supabase.rpc("apply_credit_change", {
    _user_id: userId,
    _amount: -COST_PER_ACTION,
    _transaction_type: "usage",
    _reference_type: referenceType,
    _description: `${referenceType} (${COST_PER_ACTION} credits)`,
  });

  if (!error && typeof data === "number") {
    console.log(`[credits] deducted ${COST_PER_ACTION} via apply_credit_change for ${referenceType}; remaining=${data}`);
    return data;
  }

  console.error("[credits] apply_credit_change failed, trying consume_credit", error);

  const fallback = await supabase.rpc("consume_credit", {
    _user_id: userId,
    _amount: COST_PER_ACTION,
    _reason: referenceType,
  });

  if (fallback.error) {
    console.error("[credits] consume_credit fallback failed", fallback.error);
    return null;
  }

  return typeof fallback.data === "number" ? fallback.data : null;
}

export function insufficientCreditsBody(balance: number) {
  return {
    error: INSUFFICIENT_CREDITS_MESSAGE,
    required: COST_PER_ACTION,
    available: balance,
  };
}
