export const COST_PER_ACTION = 20;
export const OWNER_EMAIL = "kadiryagiz4411@gmail.com";

export const INSUFFICIENT_CREDITS_MESSAGE =
  `Insufficient credits. Required: ${COST_PER_ACTION}`;

function isOwnerEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

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

function allowanceKind(referenceType: string): "proposal" | "cv" | null {
  const key = referenceType.toLowerCase();
  if (key.includes("proposal")) return "proposal";
  if (key.includes("cv")) return "cv";
  return null;
}

async function readFreeAllowance(
  supabase: { from: Function },
  userId: string,
  referenceType: string,
): Promise<number> {
  const kind = allowanceKind(referenceType);
  if (!kind) return 0;
  const column = kind === "proposal" ? "free_proposals_left" : "free_cvs_left";
  const { data, error } = await supabase
    .from("profiles")
    .select(column)
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();
  if (error) return 0;
  const n = Number((data as Record<string, unknown> | null)?.[column] ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function assertActionCredits(
  supabase: { from: Function },
  userId: string,
  email?: string | null,
  referenceType = "",
): Promise<{ ok: true; balance: number } | { ok: false; balance: number }> {
  if (isOwnerEmail(email)) {
    return { ok: true, balance: 999999 };
  }
  const balance = await getCreditBalance(supabase, userId);
  if (referenceType && await readFreeAllowance(supabase, userId, referenceType) > 0) {
    return { ok: true, balance };
  }
  if (balance < COST_PER_ACTION) {
    console.warn(`[credits] insufficient for ${userId}: ${balance} < ${COST_PER_ACTION}`);
    return { ok: false, balance };
  }
  return { ok: true, balance };
}

export interface ActionCharge {
  remaining: number | null;
  usedFreeAllowance: boolean;
  creditsCharged: number;
}

/**
 * Spend one free proposal/CV when one remains. Otherwise deduct COST_PER_ACTION.
 * Never call this on a failed LLM response.
 */
export async function deductActionCredits(
  supabase: { rpc: Function; from: Function },
  userId: string,
  referenceType: string,
  email?: string | null,
): Promise<ActionCharge> {
  if (isOwnerEmail(email)) {
    return { remaining: 999999, usedFreeAllowance: false, creditsCharged: 0 };
  }

  const kind = allowanceKind(referenceType);
  if (kind) {
    const free = await supabase.rpc("consume_free_allowance_for_user", {
      p_user_id: userId,
      p_kind: kind,
    });
    if (!free.error && free.data !== null && free.data !== undefined && Number.isFinite(Number(free.data))) {
      const balance = await getCreditBalance(supabase, userId);
      console.log(`[credits] used free ${kind} allowance; left=${free.data}`);
      return { remaining: balance, usedFreeAllowance: true, creditsCharged: 0 };
    }
  }

  const { data, error } = await supabase.rpc("apply_credit_change", {
    _user_id: userId,
    _amount: -COST_PER_ACTION,
    _transaction_type: "usage",
    _reference_type: referenceType,
    _description: `${referenceType} (${COST_PER_ACTION} credits)`,
  });

  if (!error && typeof data === "number") {
    console.log(`[credits] deducted ${COST_PER_ACTION} via apply_credit_change for ${referenceType}; remaining=${data}`);
    return { remaining: data, usedFreeAllowance: false, creditsCharged: COST_PER_ACTION };
  }

  console.error("[credits] apply_credit_change failed, trying consume_credit", error);

  const fallback = await supabase.rpc("consume_credit", {
    _user_id: userId,
    _amount: COST_PER_ACTION,
    _reason: referenceType,
  });

  if (fallback.error) {
    console.error("[credits] consume_credit fallback failed", fallback.error);
    return { remaining: null, usedFreeAllowance: false, creditsCharged: COST_PER_ACTION };
  }

  return {
    remaining: typeof fallback.data === "number" ? fallback.data : null,
    usedFreeAllowance: false,
    creditsCharged: COST_PER_ACTION,
  };
}

export function insufficientCreditsBody(balance: number) {
  return {
    error: INSUFFICIENT_CREDITS_MESSAGE,
    required: COST_PER_ACTION,
    available: balance,
  };
}
