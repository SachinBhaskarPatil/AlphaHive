import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, LogOut, Search, Command, Menu, X, PanelLeftClose, PanelLeft,
  BarChart2, Briefcase, Brain, Sparkles,
} from 'lucide-react';
import { PROFILE_ITEM, NAV_ITEMS, TAB_META, personaIcon } from '../../config/navigation';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Badge, IconButton, Chip } from '../ui/primitives';
import { UserAvatar } from '../Shared';
import { FloatingActionButton, MobileActionSheet } from '../ui/mobile';
import CommandPalette from './CommandPalette';

const SIDEBAR_KEY = 'mr_sidebar_collapsed';

function accountLabel(identity) {
  if (identity.name?.trim()) return identity.name.trim();
  const local = identity.handle?.split('@')[0];
  return local || 'Account';
}

function NavRailItem({ item, active, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`ah-rail-item${active ? ' ah-rail-item--active' : ''}`}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <span className="ah-rail-item__indicator" aria-hidden />
      <span className="ah-rail-item__icon"><Icon size={19} strokeWidth={active ? 2.2 : 1.8} /></span>
      {!collapsed && <span className="ah-rail-item__label">{item.label}</span>}
    </button>
  );
}

export default function AppShell({
  activeTab, selectTab, unlocked, persona, socialIdentity, onLogout, children,
}) {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { return false; }
  });

  const currentMeta = TAB_META[activeTab] || PROFILE_ITEM;
  const CurrentIcon = currentMeta.icon;

  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener('alphahive:command-palette', open);
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('alphahive:command-palette', open);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || !mobileNavOpen) return undefined;
    document.body.classList.add('mr-nav-open');
    return () => document.body.classList.remove('mr-nav-open');
  }, [isMobile, mobileNavOpen]);

  const paletteItems = useMemo(
    () => (unlocked ? [PROFILE_ITEM, ...NAV_ITEMS] : [PROFILE_ITEM]),
    [unlocked],
  );

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const navSelect = (id) => {
    selectTab(id);
    setMobileNavOpen(false);
  };

  const workspaceGroups = [
    { label: 'Account', items: [PROFILE_ITEM] },
    ...(unlocked ? [
      { label: 'Workspace', items: NAV_ITEMS.filter((n) => n.group === 'workspace') },
      { label: 'Intelligence', items: NAV_ITEMS.filter((n) => n.group === 'intel') },
      { label: 'System', items: NAV_ITEMS.filter((n) => n.group === 'system') },
    ] : []),
  ];

  const sidebar = (
    <aside className={`ah-shell-rail${collapsed ? ' ah-shell-rail--collapsed' : ''}`}>
      <div className="ah-shell-rail__brand">
        <span className="ah-shell-rail__logo"><Zap size={20} strokeWidth={2.4} /></span>
        {!collapsed && (
          <div>
            <p className="gradient-text ah-shell-rail__name">AlphaHive</p>
            <p className="ah-shell-rail__tag">AI OS</p>
          </div>
        )}
        {isMobile && (
          <IconButton label="Close menu" className="ah-shell-rail__close" onClick={() => setMobileNavOpen(false)}>
            <X size={18} />
          </IconButton>
        )}
      </div>

      <nav className="ah-shell-rail__nav mr-scroll">
        {workspaceGroups.map((group) => (
          <div key={group.label} className="ah-shell-rail__group">
            {!collapsed && <p className="ah-shell-rail__group-label">{group.label}</p>}
            {group.items.map((item) => (
              <NavRailItem
                key={item.id}
                item={item}
                active={activeTab === item.id}
                collapsed={collapsed}
                onClick={() => navSelect(item.id)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="ah-shell-rail__footer">
        {!collapsed ? (
          <div className="ah-shell-rail__account">
            <button
              type="button"
              className="ah-shell-rail__account-profile pressable"
              onClick={() => navSelect('profile')}
            >
              <UserAvatar
                src={socialIdentity.picture}
                name={accountLabel(socialIdentity)}
                size={38}
                className="ah-shell-rail__avatar"
              />
              <div className="ah-shell-rail__account-meta">
                <span className="ah-shell-rail__account-name" title={accountLabel(socialIdentity)}>
                  {accountLabel(socialIdentity)}
                </span>
                <span className="ah-shell-rail__account-email" title={socialIdentity.handle}>
                  {socialIdentity.handle}
                </span>
                {unlocked && persona !== 'Not Set' && (
                  <span className="ah-shell-rail__account-persona">
                    {personaIcon(persona)} {persona}
                  </span>
                )}
              </div>
            </button>
            <div className="ah-shell-rail__account-bar">
              {socialIdentity.provider && (
                <Badge tone="emerald">{socialIdentity.provider}</Badge>
              )}
              <div className="ah-shell-rail__account-actions">
                <button type="button" className="ah-shell-rail__signout pressable" onClick={onLogout}>
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
                {!isMobile && (
                  <IconButton
                    label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    onClick={toggleCollapsed}
                    className="ah-shell-rail__collapse"
                  >
                    <PanelLeftClose size={16} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="ah-shell-rail__account ah-shell-rail__account--collapsed">
            <UserAvatar
              as="button"
              type="button"
              src={socialIdentity.picture}
              name={accountLabel(socialIdentity)}
              size={40}
              className="ah-shell-rail__avatar ah-shell-rail__avatar--btn pressable"
              aria-label="Open profile"
              onClick={() => navSelect('profile')}
            />
            <IconButton label="Sign out" className="ah-shell-rail__signout-icon" onClick={onLogout}>
              <LogOut size={16} />
            </IconButton>
            {!isMobile && (
              <IconButton label="Expand sidebar" onClick={toggleCollapsed} className="ah-shell-rail__collapse">
                <PanelLeft size={16} />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </aside>
  );

  const topbar = (
    <header className="ah-shell-topbar">
      {isMobile && (
        <IconButton label="Open menu" onClick={() => setMobileNavOpen(true)}>
          <Menu size={20} />
        </IconButton>
      )}
      <div className="ah-shell-topbar__crumb">
        <span className="ah-shell-topbar__root">AlphaHive</span>
        <span aria-hidden>/</span>
        <span className="ah-shell-topbar__page">
          <CurrentIcon size={16} />
          {currentMeta.label}
        </span>
      </div>
      <div className="ah-shell-topbar__spacer" />
      <div className="ah-shell-topbar__actions">
        <button type="button" className="ah-shell-search pressable" onClick={() => setPaletteOpen(true)}>
          <Search size={16} />
          {!isMobile && <span>Search workspace…</span>}
          {!isMobile && <Chip><Command size={11} />K</Chip>}
        </button>
        <button
          type="button"
          className="ah-shell-topbar__profile pressable"
          title={socialIdentity.handle || 'Profile'}
          aria-label="Open profile"
          onClick={() => navSelect('profile')}
        >
          {!isMobile && (
            <span className="ah-shell-topbar__profile-meta">
              <span className="ah-shell-topbar__profile-name">{accountLabel(socialIdentity)}</span>
              {unlocked && persona !== 'Not Set' && (
                <span className="ah-shell-topbar__profile-persona">
                  {personaIcon(persona)} {persona}
                </span>
              )}
            </span>
          )}
          {isMobile && unlocked && persona !== 'Not Set' && (
            <Chip className="ah-shell-topbar__persona" title="Active persona">
              {personaIcon(persona)}
            </Chip>
          )}
          <UserAvatar
            src={socialIdentity.picture}
            name={accountLabel(socialIdentity)}
            size={36}
            className="ah-shell-topbar__avatar"
          />
        </button>
      </div>
    </header>
  );

  const bottomNav = isMobile && (
    <nav className="ah-shell-bottom">
      {[PROFILE_ITEM, ...(unlocked ? NAV_ITEMS.slice(0, 4) : [])].map(({ id, shortLabel, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`ah-shell-bottom__item${activeTab === id ? ' ah-shell-bottom__item--active' : ''}`}
          onClick={() => navSelect(id)}
          aria-label={shortLabel}
        >
          <Icon size={20} />
          <span>{shortLabel}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="ah-shell">
      <div className="ah-shell__ambient" aria-hidden />
      {!isMobile && sidebar}
      <div className="ah-shell__main">
        {topbar}
        <main className="ah-shell-content mr-scroll">
          <div className="ah-shell-content__inner">{children}</div>
        </main>
      </div>
      {bottomNav}

      {isMobile && unlocked && (
        <>
          <FloatingActionButton onClick={() => setFabOpen(true)} />
          <MobileActionSheet
            open={fabOpen}
            onClose={() => setFabOpen(false)}
            actions={[
              { id: 'analyze', label: 'Analyze stock', desc: 'Market intelligence hub', icon: BarChart2, onClick: () => navSelect('dashboard') },
              { id: 'portfolio', label: 'Portfolio', desc: 'Holdings & reports', icon: Briefcase, onClick: () => navSelect('portfolio') },
              { id: 'brain', label: 'Agent brain', desc: 'Memory & autonomy', icon: Brain, onClick: () => navSelect('brain') },
              { id: 'search', label: 'Search', desc: 'Command palette ⌘K', icon: Sparkles, onClick: () => setPaletteOpen(true) },
            ]}
          />
        </>
      )}

      <AnimatePresence>
        {isMobile && mobileNavOpen && (
          <>
            <motion.div
              className="ah-shell-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              className="ah-shell-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              drag={isMobile ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -400) setMobileNavOpen(false);
              }}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        onSelect={navSelect}
      />
    </div>
  );
}
