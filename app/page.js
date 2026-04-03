import Link from 'next/link';

const features = [
  {
    icon: '⚡',
    title: 'Real-time Analytics',
    desc: 'Live data connections mean your dashboards are always up to date — no manual refreshes required.',
  },
  {
    icon: '🔒',
    title: 'Secure by Default',
    desc: 'JWT-signed embed URLs ensure every user only sees the data they are authorized to access.',
  },
  {
    icon: '🎨',
    title: 'Fully Customizable',
    desc: 'Match your brand with custom themes, layouts, and responsive design out of the box.',
  },
  {
    icon: '👥',
    title: 'Team Workspaces',
    desc: 'Organize content by team with granular access controls and role-based permissions.',
  },
  {
    icon: '📊',
    title: 'Rich Visualizations',
    desc: 'Charts, tables, pivot grids, and more — Sigma\'s full visualization library, embedded.',
  },
  {
    icon: '🔗',
    title: 'Deep Integrations',
    desc: 'Connect to Snowflake, BigQuery, Redshift, and more with a single configuration.',
  },
];

const steps = [
  {
    title: 'Sign in with your account',
    desc: 'Log in to Prism Analytics using your company credentials. Your role and teams determine what data you can access.',
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Prism Analytics</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition">How it works</a>
            <a href="#" className="hover:text-gray-900 transition">Pricing</a>
            <a href="#" className="hover:text-gray-900 transition">Docs</a>
          </nav>

          <Link
            href="/login"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="py-28 px-6 text-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Powered by Sigma Computing
          </span>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Embedded analytics that{' '}
            <span className="text-indigo-600">feel native</span>{' '}
            to your product
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Prism Analytics brings Sigma&apos;s powerful data exploration directly into your
            workflow — secure, fast, and built for your team.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="bg-indigo-600 text-white px-7 py-3 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              Get Started
            </Link>
            <a
              href="#how-it-works"
              className="text-gray-600 px-7 py-3 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '10x', label: 'Faster time to insight' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<200ms', label: 'Avg. embed load time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-bold text-indigo-600">{stat.value}</div>
              <div className="text-gray-400 mt-1 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need, built in</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              One platform. Every analytics capability your team requires.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 text-xl group-hover:bg-indigo-100 transition">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-400">Three steps from login to live analytics.</p>
          </div>
          <div className="space-y-10">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-6 items-start">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {i + 1}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 px-6 bg-indigo-600 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to see your data come alive?
          </h2>
          <p className="text-indigo-200 mb-8">
            Sign in to access your embedded analytics dashboard.
          </p>
          <Link
            href="/login"
            className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition shadow-sm"
          >
            Sign In Now
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Prism Analytics · Built with{' '}
        <span className="text-indigo-500 font-medium">Sigma Computing</span>
      </footer>

    </div>
  );
}
