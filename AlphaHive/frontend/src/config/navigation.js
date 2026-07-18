import {
  Activity, Eye, History, Calendar, Briefcase, Brain, Shield, LayoutDashboard,
} from 'lucide-react';

export const PROFILE_ITEM = {
  id: 'profile',
  label: 'Investor Profile',
  shortLabel: 'Profile',
  icon: Shield,
  desc: 'Persona, risk & onboarding',
  group: 'account',
};

export const NAV_ITEMS = [
  { id: 'home', label: 'Command Center', shortLabel: 'Home', icon: LayoutDashboard, desc: 'AI swarm overview & live intelligence', group: 'workspace' },
  { id: 'portfolio', label: 'Portfolio', shortLabel: 'Portfolio', icon: Briefcase, desc: 'AI-optimized allocations & risk', group: 'workspace' },
  { id: 'dashboard', label: 'Market Analysis', shortLabel: 'Markets', icon: Activity, desc: 'Deep-dive stock & index intelligence', group: 'workspace' },
  { id: 'shadow', label: 'Shadow Tracker', shortLabel: 'Shadow', icon: Eye, desc: 'Smart-money & institutional flow', group: 'intel' },
  { id: 'forecasts', label: 'Forecasts', shortLabel: 'Forecast', icon: History, desc: 'Scenario forecasts & seasonality', group: 'intel' },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: Calendar, desc: 'Seasonality & event windows', group: 'intel' },
  { id: 'brain', label: 'Agent Brain', shortLabel: 'Brain', icon: Brain, desc: 'Agent memory & autonomy', group: 'system' },
  { id: 'health', label: 'System Health', shortLabel: 'Health', icon: Activity, desc: 'Platform status & workflows', group: 'system' },
];

export const ALL_NAV = [PROFILE_ITEM, ...NAV_ITEMS];

export const TAB_META = ALL_NAV.reduce((acc, it) => { acc[it.id] = it; return acc; }, {});

export function personaIcon(p) {
  if (p?.includes('Hunter')) return '🦅';
  if (p?.includes('Defender')) return '🛡️';
  if (p?.includes('Preserver')) return '🌱';
  return '🚀';
}
