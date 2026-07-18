import { motion } from 'framer-motion';
import {
  Home, Briefcase, BarChart3, Eye, Brain, Zap,
  TrendingUp, Activity, Sparkles,
} from 'lucide-react';
import { AGENTS } from './AIExperience';

const NAV = [
  { icon: Home, active: true },
  { icon: Briefcase, active: false },
  { icon: BarChart3, active: false },
  { icon: Eye, active: false },
  { icon: Brain, active: false },
];

const MODULE_COUNT = AGENTS.length;
const PLATFORM_AGENTS = 4;

/** Static UI illustration only — not live app data. */
export default function LandingProductMock() {
  return (
    <div className="landing-preview-frame" aria-hidden>
      <p className="landing-preview-frame__label">UI illustration</p>
      <div className="landing-preview-frame__glow" />
      <div className="landing-preview-frame__ring" />

      <motion.div
        className="landing-mock landing-mock--rich"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-mock__chrome">
          <div className="landing-mock__dots">
            <span /><span /><span />
          </div>
          <div className="landing-mock__url">
            <span className="landing-mock__lock" />
            alphahive.app / command-center
          </div>
          <div className="landing-mock__chrome-spacer" />
        </div>

        <div className="landing-mock__body">
          <aside className="landing-mock__rail">
            <div className="landing-mock__rail-logo">
              <Zap size={14} strokeWidth={2.4} />
            </div>
            {NAV.map(({ icon: Icon, active }, i) => (
              <div
                key={i}
                className={`landing-mock__rail-item${active ? ' landing-mock__rail-item--active' : ''}`}
              >
                <Icon size={14} strokeWidth={2.2} />
              </div>
            ))}
          </aside>

          <main className="landing-mock__workspace">
            <header className="landing-mock__topbar">
              <div>
                <p className="landing-mock__crumb">Command Center</p>
                <p className="landing-mock__greet">Layout preview</p>
              </div>
            </header>

            <div className="landing-mock__hero">
              <div className="landing-mock__hero-copy">
                <Sparkles size={16} className="landing-mock__hero-icon" />
                <div>
                  <p className="landing-mock__hero-title">Analysis pipeline</p>
                  <p className="landing-mock__hero-sub">{MODULE_COUNT} modules · {PLATFORM_AGENTS} platform agents</p>
                </div>
              </div>
            </div>

            <div className="landing-mock__metrics">
              <div className="landing-mock__metric">
                <span className="landing-mock__metric-label">Modules</span>
                <span className="landing-mock__metric-value">{MODULE_COUNT}</span>
              </div>
              <div className="landing-mock__metric">
                <span className="landing-mock__metric-label">Platform</span>
                <span className="landing-mock__metric-value">{PLATFORM_AGENTS}</span>
              </div>
              <div className="landing-mock__metric landing-mock__metric--live">
                <span className="landing-mock__metric-label">Markets</span>
                <span className="landing-mock__metric-value">NSE/BSE</span>
              </div>
            </div>

            <div className="landing-mock__panels">
              <div className="landing-mock__panel landing-mock__panel--chart">
                <div className="landing-mock__panel-head">
                  <TrendingUp size={13} />
                  <span>Sector momentum</span>
                </div>
                <p className="landing-mock__panel-note">From Shadow Tracker API after sign-in</p>
              </div>

              <div className="landing-mock__panel landing-mock__panel--feed">
                <div className="landing-mock__panel-head">
                  <Activity size={13} />
                  <span>Shadow signals</span>
                </div>
                <p className="landing-mock__panel-note">Populated from your analysis history</p>
              </div>
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  );
}
