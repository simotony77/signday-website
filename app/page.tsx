import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const FEATURES = [
  {
    icon: "🎯",
    title: "Honest Recruiting Snapshot",
    body: "AI-powered fit assessment in 3 minutes. We tell you the truth about D1, D2, and D3 fit — not what you want to hear.",
  },
  {
    icon: "✉️",
    title: "AI Coach Emails",
    body: "Personalized outreach to coaches, written in 30 seconds — not 30 minutes. Specific, genuine, and brief — the way coaches want them.",
  },
  {
    icon: "📅",
    title: "Your Full Timeline",
    body: "A recruiting calendar built for your athlete's exact graduation year. Never miss a deadline, an eligibility window, or a contact period.",
  },
  {
    icon: "🏫",
    title: "School CRM",
    body: "Track every program in one place. Coaches contacted, response status, visit dates, and offers — all organized.",
  },
  {
    icon: "🔔",
    title: "Smart Follow-Up Reminders",
    body: "21-day follow-up nudges so you never go silent at the wrong moment. Consistency wins recruiting.",
  },
  {
    icon: "🏆",
    title: "Decision Support",
    body: "Side-by-side comparison when offers come in. Plus a gut-check question that helps families make decisions they can live with.",
  },
];

const FAQ = [
  {
    q: "Who is SignDay for?",
    a: "Families with high-school-aged female soccer players (Class of 2026-2029) navigating the college recruiting process. We focus on women's soccer at the D3, D2, and D1 levels.",
  },
  {
    q: "How is this different from NCSA?",
    a: "NCSA charges $1,500-3,000 per family and is built around generic athletic recruiting. SignDay was built by a soccer parent who lived this process at the D3 goalkeeper level. It's specific to soccer, designed for both parents and athletes, and a fraction of the cost.",
  },
  {
    q: "Do you contact coaches for us?",
    a: "No. SignDay is an organizational tool. Our AI generates draft emails that you copy and send from your own email account. This keeps you in control and ensures NCAA compliance.",
  },
  {
    q: "What about my athlete's privacy?",
    a: "Athletes must be 13 or older. Parents create the family account and invite the athlete. We never sell data, never show ads, and never share information with college coaches. Read our Privacy Policy for details.",
  },
  {
    q: "When should we start?",
    a: "The best time is sophomore year (Class of 2028 right now), but it's never too late. We seed your recruiting timeline based on your athlete's graduation year — so the app adjusts to where you are.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-32 text-center">
          <div className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            For Soccer Families
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            The recruiting<br />companion built<br /><span className="text-brand-600">by a soccer parent.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            AI-powered coach emails, a school tracker, and your full recruiting timeline — all in one place.
            Stop guessing. Start landing offers.
          </p>

          <div id="download" className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#"
              className="bg-black text-white rounded-xl px-6 py-4 inline-flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon to</div>
                <div className="text-base font-semibold leading-tight">App Store</div>
              </div>
            </a>
            <a
              href="#"
              className="bg-black text-white rounded-xl px-6 py-4 inline-flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <span className="text-2xl">▶</span>
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon to</div>
                <div className="text-base font-semibold leading-tight">Google Play</div>
              </div>
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">7-day free trial. Cancel anytime.</p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-brand-600">~430</div>
            <div className="text-xs text-gray-500 mt-1">D3 programs covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-600">D1 / D2 / D3</div>
            <div className="text-xs text-gray-500 mt-1">All NCAA divisions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-600">2-3 yrs</div>
            <div className="text-xs text-gray-500 mt-1">Average recruiting journey</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-600">Built by a parent</div>
            <div className="text-xs text-gray-500 mt-1">Not a recruiting agency</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Built for the way recruiting actually works
            </h2>
            <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
              Six tools that turn 2-3 years of recruiting chaos into a system that actually moves your athlete forward.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="py-24 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Built by a soccer parent. Not a recruiting agency.
          </h2>
          <p className="text-lg leading-relaxed text-blue-100 mb-4">
            SignDay was created by a parent who navigated the D3 goalkeeper recruiting process firsthand —
            with all the late-night spreadsheets, missed deadlines, and "wait, when does the contact period open?" panic.
          </p>
          <p className="text-lg leading-relaxed text-blue-100">
            The big platforms charge $3,000+ and treat your daughter like a metric. We built the tool we wish we'd had:
            honest, soccer-specific, and actually useful.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple pricing.</h2>
            <p className="text-lg text-gray-600 mt-4">
              One subscription covers your whole family — parent and athlete logins included.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Annual */}
            <div className="bg-brand-600 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                BEST VALUE
              </div>
              <div className="text-sm font-medium opacity-90 uppercase tracking-wider">Annual</div>
              <div className="mt-3 flex items-baseline">
                <span className="text-5xl font-extrabold">$149</span>
                <span className="text-lg opacity-80 ml-2">/year</span>
              </div>
              <p className="mt-2 text-blue-100 text-sm">Just $12/month — save 58% vs monthly.</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li>✓ Full Pro access</li>
                <li>✓ AI coach emails</li>
                <li>✓ Recruiting timeline</li>
                <li>✓ Decision support</li>
                <li>✓ 7-day free trial</li>
              </ul>
            </div>

            {/* Monthly */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Monthly</div>
              <div className="mt-3 flex items-baseline">
                <span className="text-5xl font-extrabold text-gray-900">$29.99</span>
                <span className="text-lg text-gray-500 ml-2">/month</span>
              </div>
              <p className="mt-2 text-gray-600 text-sm">Cancel anytime.</p>
              <ul className="mt-6 space-y-2 text-sm text-gray-700">
                <li>✓ Full Pro access</li>
                <li>✓ AI coach emails</li>
                <li>✓ Recruiting timeline</li>
                <li>✓ Decision support</li>
                <li>✓ 7-day free trial</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-8">
            Subscriptions billed via Apple App Store or Google Play. Manage or cancel anytime in your device's settings.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-brand-50 to-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Stop guessing. Start landing offers.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Download SignDay and get your athlete's honest Recruiting Snapshot in 3 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#" className="bg-black text-white rounded-xl px-6 py-4 inline-flex items-center gap-3">
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon to</div>
                <div className="text-base font-semibold leading-tight">App Store</div>
              </div>
            </a>
            <a href="#" className="bg-black text-white rounded-xl px-6 py-4 inline-flex items-center gap-3">
              <span className="text-2xl">▶</span>
              <div className="text-left">
                <div className="text-xs opacity-80">Coming soon to</div>
                <div className="text-base font-semibold leading-tight">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
