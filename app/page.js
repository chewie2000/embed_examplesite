import Link from 'next/link';
import Image from 'next/image';

const AVATARS = [
  { id: 'photo-1494790108377-be9c29b29330', alt: 'Team member' },
  { id: 'photo-1507003211169-0a1dd7228f2d', alt: 'Team member' },
  { id: 'photo-1500648767791-00dcc994a43e', alt: 'Team member' },
  { id: 'photo-1438761681033-6461ffad8d80', alt: 'Team member' },
  { id: 'photo-1472099645785-5658abf4ff4e', alt: 'Team member' },
];

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Real-time Analytics',
    desc: 'Live data connections mean your dashboards are always current — no manual refreshes.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure by Default',
    desc: 'JWT-signed embed URLs ensure every user only sees the data they are authorized to access.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    title: 'Fully Customizable',
    desc: 'Match your brand with custom themes, layouts, and responsive design out of the box.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Team Workspaces',
    desc: 'Organize content by team with granular access controls and role-based permissions.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Rich Visualizations',
    desc: "Charts, tables, pivot grids, and more — Sigma's full visualization library, embedded.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Deep Integrations',
    desc: 'Connect to Snowflake, BigQuery, Redshift, and more with a single configuration.',
  },
];

const steps = [
  {
    title: 'Sign in with your account',
    desc: 'Log in using your company credentials. Your role and teams determine what data you can access.',
  },
  {
    title: 'Your session is authenticated',
    desc: 'Our backend issues a signed JWT that tells Sigma who you are, what you can see, and how long your session is valid.',
  },
  {
    title: 'Explore your embedded analytics',
    desc: 'Sigma content loads directly in the dashboard — interactive, filterable, and scoped to your permissions.',
  },
];

function MiniDashboard() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-indigo-600/20 blur-[60px] rounded-3xl" />

      <div className="relative glass rounded-2xl p-5 shadow-2xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500">Dashboard overview</p>
            <p className="text-sm font-semibold text-white">Q4 Performance</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Revenue', value: '$2.4M', change: '+12.5%', up: true },
            { label: 'Users', value: '48.2K', change: '+8.1%', up: true },
            { label: 'Conversion', value: '3.24%', change: '-0.3%', up: false },
          ].map((m) => (
            <div key={m.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 mb-1">{m.label}</p>
              <p className="text-sm font-bold text-white">{m.value}</p>
              <p className={`text-[10px] mt-0.5 font-medium ${m.up ? 'text-emerald-400' : 'text-red-400'}`}>{m.change}</p>
            </div>
          ))}
        </div>

        {/* SVG line chart */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 mb-3">
          <p className="text-[10px] text-zinc-500 mb-2">Revenue trend</p>
          <svg viewBox="0 0 300 80" className="w-full h-16">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points="10,70 45,55 80,62 115,42 150,50 185,28 220,20 265,12 265,78 10,78"
              fill="url(#lg)"
            />
            <polyline
              points="10,70 45,55 80,62 115,42 150,50 185,28 220,20 265,12"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="265" cy="12" r="3" fill="#6366f1" />
            <circle cx="265" cy="12" r="6" fill="#6366f1" fillOpacity="0.25" />
          </svg>
        </div>

        {/* Bar chart row */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
          <p className="text-[10px] text-zinc-500 mb-3">Monthly breakdown</p>
          <div className="flex items-end gap-2 h-10">
            {[35, 55, 42, 70, 58, 85, 65, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, #6366f1, #8b5cf6)`,
                  opacity: i === 7 ? 1 : 0.5 + i * 0.06,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white text-xs font-bold tracking-tight">🎯</span>
            </div>
            <span className="text-sm font-semibold text-white">Embed Success</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </nav>
          <Link
            href="/login"
            className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden grid-bg pt-24 pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Powered by Sigma Computing
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              <span className="gradient-text">Embedded analytics</span>
              <br />
              <span className="text-white">that feel native.</span>
            </h1>
            <p className="text-lg text-zinc-400 mb-10 leading-relaxed max-w-lg">
              Embed Success brings Sigma&apos;s powerful data exploration directly into your workflow — secure, fast, and built for your team.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-10">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors shadow-xl shadow-indigo-500/25"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 px-6 py-3 rounded-lg font-medium text-sm transition-all"
              >
                See How It Works
              </a>
            </div>

            {/* Social proof avatars */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {AVATARS.map((a, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] overflow-hidden relative">
                    <Image
                      src={`https://images.unsplash.com/${a.id}?w=80&h=80&q=80&auto=format&fit=crop&crop=face`}
                      alt={a.alt}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <span className="text-white font-semibold">500+</span>
                <span className="text-zinc-500"> teams already on board</span>
              </div>
            </div>
          </div>

          {/* Right — mini dashboard */}
          <div className="hidden lg:block">
            <MiniDashboard />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/[0.06] py-14">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '10x', label: 'Faster time to insight' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<200ms', label: 'Avg. embed load time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-zinc-500 mt-1.5 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Photo break — team at work ── */}
      <section className="relative h-80 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80&auto=format&fit=crop"
          alt="Team collaborating with data"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-12 max-w-7xl mx-auto">
          <div className="max-w-md">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Built for modern teams</p>
            <p className="text-2xl font-bold text-white leading-snug">
              "We went from weekly reports to real-time decisions overnight."
            </p>
            <p className="text-sm text-zinc-500 mt-3">— Head of Analytics, Series B SaaS company</p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Everything you need, built in</h2>
            <p className="text-zinc-500 max-w-md mx-auto text-sm">One platform. Every analytics capability your team requires.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
            {features.map((f) => (
              <div key={f.title} className="bg-[#09090b] p-7 hover:bg-white/[0.02] transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Photo break — data/tech ── */}
      <section className="relative h-72 overflow-hidden mx-6 rounded-2xl border border-white/[0.06] mb-28">
        <Image
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80&auto=format&fit=crop"
          alt="Analytics dashboard"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#09090b]/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Powered by Sigma</p>
          <h3 className="text-2xl font-bold text-white max-w-lg">
            Your data. Your brand. Embedded seamlessly.
          </h3>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">How it works</h2>
            <p className="text-zinc-500 text-sm">Three steps from login to live analytics.</p>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-6 bottom-6 w-px bg-gradient-to-b from-indigo-500/50 via-violet-500/30 to-transparent" />
            <div className="space-y-10">
              {steps.map((step, i) => (
                <div key={step.title} className="flex gap-6 items-start pl-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg shadow-indigo-500/25 relative z-10">
                    {i + 1}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-white mb-1.5 text-sm">{step.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 border-t border-white/[0.06]">
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-40 bg-indigo-600/15 rounded-full blur-[60px]" />
          </div>
          <div className="relative glass rounded-2xl px-10 py-14 glow-accent">
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
              Ready to see your data come alive?
            </h2>
            <p className="text-zinc-400 mb-8 text-sm">
              Sign in to access your embedded analytics dashboard.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-lg font-medium text-sm transition-colors shadow-xl shadow-indigo-500/25"
            >
              Sign In Now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/[0.06] text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} Embed Success · Built with{' '}
        <span className="text-indigo-400">Sigma Computing</span>
      </footer>

    </div>
  );
}
