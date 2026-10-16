import type { LucideIcon } from 'lucide-react';
import {
  Mic, Globe, ShieldAlert, Upload, Users, Database, ClipboardList, Trophy, BookOpen, Building2, LayoutDashboard, Layers, Sparkles, ScanSearch, FileText,
} from 'lucide-react';
import type { AccessTier } from '@/hooks/useTierAccess';

export interface TierNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  required: AccessTier;
}

export const ELITE_NAV_ITEMS: TierNavItem[] = [
  { to: '/interview-simulator', label: 'Interview Simulator', icon: Mic, required: 'elite' },
  { to: '/portfolio-builder', label: 'Portfolio Builder', icon: Globe, required: 'elite' },
  { to: '/cv-analyzer', label: 'CV Analyzer', icon: ShieldAlert, required: 'elite' },
  { to: '/dashboard/intelligence', label: 'Intelligence Hub', icon: Sparkles, required: 'pro' },
  { to: '/dashboard/proposals', label: 'Multi-Job Proposals', icon: ClipboardList, required: 'pro' },
  { to: '/batch-proposal', label: 'B2B Batch Generator', icon: ClipboardList, required: 'pro' },
  { to: '/knowledge-base', label: 'Agency Knowledge Base', icon: BookOpen, required: 'pro' },
  { to: '/crm', label: 'Proposals CRM', icon: Trophy, required: 'elite' },
];

export const ENTERPRISE_NAV_ITEMS: TierNavItem[] = [
  { to: '/dashboard/command-center', label: 'Command Center', icon: LayoutDashboard, required: 'enterprise' },
  { to: '/dashboard/evaluator', label: 'Multi-CV Evaluator', icon: Layers, required: 'enterprise' },
  { to: '/dashboard/analyzer', label: 'Multi-CV Analyzer', icon: ScanSearch, required: 'enterprise' },
  { to: '/dashboard/candidates', label: 'Candidate Pool', icon: Users, required: 'enterprise' },
  { to: '/dashboard/builder', label: 'CV Builder', icon: FileText, required: 'enterprise' },
  { to: '/cv-batch-analyzer', label: 'Legacy Batch Analyzer', icon: ScanSearch, required: 'enterprise' },
  { to: '/batch-upload', label: 'Batch Upload & Rank', icon: Upload, required: 'enterprise' },
  { to: '/team', label: 'Team Workspace', icon: Users, required: 'enterprise' },
  { to: '/talent-pool', label: 'Talent Pool', icon: Database, required: 'enterprise' },
  { to: '/organization', label: 'Org Dashboard', icon: Building2, required: 'enterprise' },
  { to: '/b2b', label: 'B2B HR Engine', icon: LayoutDashboard, required: 'enterprise' },
];
