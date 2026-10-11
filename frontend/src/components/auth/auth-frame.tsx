import Link from 'next/link';
import { ArrowUpRight, ChartNoAxesCombined, CircleDollarSign, Sparkles } from 'lucide-react';

export function AuthFrame({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: 'login' | 'signup';
}) {
  return (
    <div className="auth-page">
      <div className="auth-window">
        <aside className="auth-story">
          <Link href="/login" className="auth-brand">
            <span className="auth-brand-mark"><CircleDollarSign size={22} strokeWidth={1.8} /></span>
            <span>northstar<span className="auth-brand-period">.</span></span>
          </Link>

          <div className="auth-story-copy">
            <span className="auth-kicker"><Sparkles size={14} /> A clearer view of your money</span>
            <h1>Feel good about<br />where it <span>goes.</span></h1>
            <p>Bring your everyday finances into focus. Simple tracking, useful insights, and room to make your next move.</p>
          </div>

          <div className="auth-preview" aria-label="Illustration of a monthly spending summary">
            <div className="auth-preview-head">
              <span className="auth-preview-icon"><ChartNoAxesCombined size={17} /></span>
              <span><b>Your month</b><small>Spending at a glance</small></span>
              <ArrowUpRight className="auth-preview-arrow" size={17} />
            </div>
            <div className="auth-preview-number">$2,480<span>.00</span></div>
            <div className="auth-preview-caption">tracked this month</div>
            <div className="auth-bars" aria-hidden="true">
              {[30, 49, 37, 66, 45, 79, 57, 90, 62, 74, 52, 86].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} className={index === 7 ? 'is-highlight' : ''} />
              ))}
            </div>
            <div className="auth-preview-foot"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
          </div>

          <div className="auth-story-footer"><span className="auth-status-dot" /> Your finances stay private and secure</div>
          <div className="auth-story-shape auth-story-shape-one" />
          <div className="auth-story-shape auth-story-shape-two" />
        </aside>

        <section className="auth-form-side">
          <div className="auth-mobile-brand"><Link href="/login" className="auth-brand"><span className="auth-brand-mark"><CircleDollarSign size={21} /></span><span>northstar<span className="auth-brand-period">.</span></span></Link></div>
          <div className="auth-form-content">
            <div className="auth-form-kicker">{mode === 'signup' ? 'GET STARTED' : 'WELCOME BACK'}</div>
            {children}
            <p className="auth-legal">By continuing, you agree to keep your account details safe.</p>
          </div>
          <span className="auth-copyright">NORTHSTAR FINANCE <span>·</span> PERSONAL MONEY, IN FOCUS</span>
        </section>
      </div>
    </div>
  );
}
