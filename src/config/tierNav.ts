import type { LucideIcon } from 'lucide-react';
import {
  Mic, Globe, ShieldAlert, Upload, Users, Database,
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
];

export const ENTERPRISE_NAV_ITEMS: TierNavItem[] = [
  { to: '/batch-upload', label: 'Batch Upload & Rank', icon: Upload, required: 'enterprise' },
  { to: '/team', label: 'Team Workspace', icon: Users, required: 'enterprise' },
  { to: '/talent-pool', label: 'Talent Pool', icon: Database, required: 'enterprise' },
];
