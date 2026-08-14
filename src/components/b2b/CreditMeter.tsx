import { useState, useEffect } from "react";
import {
  Zap, TrendingDown, ShoppingCart, X, Check, Loader2,
  History, ChevronRight, AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CreditLedger, CreditPackage, CreditTransaction,
  fetchCreditBalance, fetchCreditPackages, fetchCreditTransactions,
  getCreditStatusColor, getCreditStatusLabel, formatCredits,
  estimateEvaluationsRemaining, CREDIT_COSTS,
} from "@/services/b2b/creditSystem";

interface Props {
  orgId: string;
  compact?: boolean;
}

export default function CreditMeter({ orgId, compact = false }: Props) {
  const [ledger, setLedger] = useState<CreditLedger | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<"packages" | "history">("packages");

  useEffect(() => {
    loadData();
  }, [orgId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bal, pkgs] = await Promise.all([
        fetchCreditBalance(orgId),
        fetchCreditPackages(),
      ]);
      setLedger(bal);
      setPackages(pkgs);
    } catch (err) {
      console.error("CreditMeter load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    const txns = await fetchCreditTransactions(orgId, 30);
    setTransactions(txns);
  };

  const balance = ledger?.credits_balance ?? 0;
  const statusColor = getCreditStatusColor(balance);
  const statusLabel = getCreditStatusLabel(balance);
  const remaining = estimateEvaluationsRemaining(balance);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-500/50 transition-all"
        >
          <Zap className={cn("w-3.5 h-3.5", isLoading ? "text-slate-500" : statusColor)} />
          {isLoading
            ? <span className="text-xs text-slate-500">...</span>
            : (
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-bold font-mono", statusColor)}>
                  {formatCredits(balance)}
                </span>
                <span className="text-xs text-slate-500">credits</span>
                {balance <= 30 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              </div>
            )
          }
        </button>
        {showPanel && (
          <CreditPanel
            orgId={orgId}
            ledger={ledger}
            packages={packages}
            transactions={transactions}
            activeTab={activeTab}
            onTabChange={t => { setActiveTab(t); if (t === "history") loadHistory(); }}
            onClose={() => setShowPanel(false)}
            onRefresh={loadData}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-slate-300">AI Credits</span>
        </div>
        <Badge className={cn("text-xs border", balance <= 10 ? "bg-red-500/20 text-red-400 border-red-500/30" : balance <= 30 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}>
          {statusLabel}
        </Badge>
      </div>

      {isLoading ? (
        <div className="h-8 flex items-center"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <div>
            <span className={cn("text-3xl font-black font-mono", statusColor)}>{formatCredits(balance)}</span>
            <span className="text-sm text-slate-500 ml-1.5">credits remaining</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>≈ {remaining} evaluations left</span>
              <span>{CREDIT_COSTS.cv_evaluation} credits per CV</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  balance > 100 ? "bg-violet-500" : balance > 30 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, (balance / Math.max(ledger?.credits_lifetime ?? 200, 200)) * 100)}%` }}
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setShowPanel(true)}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Top Up Credits
          </Button>
        </>
      )}

      {showPanel && (
        <CreditPanel
          orgId={orgId}
          ledger={ledger}
          packages={packages}
          transactions={transactions}
          activeTab={activeTab}
          onTabChange={t => { setActiveTab(t); if (t === "history") loadHistory(); }}
          onClose={() => setShowPanel(false)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}

// ─── Credit Purchase Panel ────────────────────────────────────────────────

function CreditPanel({
  orgId, ledger, packages, transactions, activeTab, onTabChange, onClose, onRefresh,
}: {
  orgId: string;
  ledger: CreditLedger | null;
  packages: CreditPackage[];
  transactions: CreditTransaction[];
  activeTab: "packages" | "history";
  onTabChange: (t: "packages" | "history") => void;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const balance = ledger?.credits_balance ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              AI Credits — Pay As You Go
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current balance: <span className={cn("font-bold", getCreditStatusColor(balance))}>{formatCredits(balance)}</span> credits
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credit costs info */}
        <div className="px-5 pt-4 pb-0">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 mb-4">
            <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-0.5">
              <p><span className="text-violet-300 font-medium">{CREDIT_COSTS.cv_evaluation} credits</span> per CV evaluation · <span className="text-violet-300 font-medium">{CREDIT_COSTS.talent_search} credits</span> per talent search</p>
              <p className="text-slate-500">Credits never expire. Unused balance rolls over indefinitely.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5">
          {(["packages", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={cn(
                "pb-2.5 pt-1 text-sm font-medium mr-6 border-b-2 transition-colors",
                activeTab === t
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t === "packages" ? "Top Up" : "History"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 max-h-80 overflow-y-auto">
          {activeTab === "packages" ? (
            <div className="space-y-2.5">
              {packages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">No transactions yet.</p>
              ) : (
                transactions.map(txn => (
                  <TransactionRow key={txn.id} txn={txn} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg }: { pkg: CreditPackage }) {
  const isPopular = pkg.name.includes("Growth") || pkg.name.includes("Agency");
  const totalCredits = pkg.credits + pkg.bonus_credits;
  const ppu = (pkg.price_usd / totalCredits).toFixed(2);

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:border-violet-500/60 hover:bg-violet-500/5",
      isPopular ? "border-violet-500/40 bg-violet-500/10" : "border-slate-700"
    )}>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-200">{pkg.name}</p>
          {isPopular && <Badge className="bg-violet-600/30 text-violet-300 border-violet-500/40 text-xs px-1.5 py-0">Popular</Badge>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {pkg.credits.toLocaleString()} credits
          {pkg.bonus_credits > 0 && (
            <span className="text-emerald-400 ml-1">+{pkg.bonus_credits} bonus</span>
          )}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">${ppu}/credit · ≈ {Math.floor(totalCredits / CREDIT_COSTS.cv_evaluation)} evaluations</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-slate-100">${pkg.price_usd.toFixed(0)}</span>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5 h-8">
          <ShoppingCart className="w-3.5 h-3.5" />
          Buy
        </Button>
      </div>
    </div>
  );
}

function TransactionRow({ txn }: { txn: CreditTransaction }) {
  const isCredit = txn.amount > 0;
  const typeIcons: Record<string, React.ReactNode> = {
    purchase: <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />,
    evaluation: <Zap className="w-3.5 h-3.5 text-violet-400" />,
    refund: <Check className="w-3.5 h-3.5 text-blue-400" />,
    bonus: <Check className="w-3.5 h-3.5 text-amber-400" />,
    expiry: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,
  };

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
        {typeIcons[txn.transaction_type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 truncate">{txn.description}</p>
        <p className="text-xs text-slate-600">{new Date(txn.created_at).toLocaleDateString("en-GB")}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn("text-sm font-bold font-mono", isCredit ? "text-emerald-400" : "text-red-400")}>
          {isCredit ? "+" : ""}{txn.amount}
        </p>
        <p className="text-xs text-slate-600">{txn.balance_after} left</p>
      </div>
    </div>
  );
}
