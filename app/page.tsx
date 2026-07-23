import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BuyButton } from "@/components/BuyButton";

const SPORTS_COVERED = ["Soccer", "Volleyball", "Baseball", "Softball", "Lacrosse"];

const BULLETS = [
  {
    icon: "🔍",
    title: "Every roster, re-read weekly",
    body: "We watch the official roster of every school on your list — players, class years, coaching staff. When something changes, you know that Sunday. You stop refreshing athletics sites at midnight.",
  },
  {
    icon: "🎯",
    title: "Position openings, flagged",
    body: "The flag that matters: “2 of 3 setters on the roster graduate by spring 2027 — the class your athlete would join.” We read every class year at your kid's position and tell you where a spot is opening, school by school.",
  },
  {
    icon: "📬",
    title: "One email, every Sunday",
    body: "No dashboard to remember, no app to check. A weekly digest with your position watch, roster and coach changes, and — when something genuinely opens a door — a ready-to-edit coach email as a bonus.",
  },
];

const FAQ = [
  {
    q: "What sports does it cover?",
    a: "Soccer (men's and women's), women's volleyball, baseball, softball, and lacrosse (men's and women's). Any division: D1, D2, D3, or NAIA. It started with my daughter's soccer recruiting and expanded to the sports with the same problem: published rosters, positional scarcity, and families doing the tracking by hand.",
  },
  {
    q: "How do the position flags work?",
    a: "Every week we read each school's official roster and every player's class year at your athlete's position. Then we answer the only question that matters: how many of them are gone by the year your athlete would arrive? Two graduating setters in 2027 means a 2027 setter has a real door. Four freshman keepers means a tough room. You see it school by school, every Sunday.",
  },
  {
    q: "Where does the data come from?",
    a: "The schools' own athletics websites — the same roster pages coaches maintain. We re-read them weekly, compare against last week, and filter out the noise (page glitches, formatting changes) so you only see real moves.",
  },
  {
    q: "Do you email coaches for us?",
    a: "You send, we draft. When a genuine opening appears — a coach change, a big win, a position gap — the digest includes a ready-to-edit email grounded in that program's real data. Your athlete edits it and sends it from their own Gmail, so it lands as a real personal email, not platform spam.",
  },
  {
    q: "I'm a college player looking to transfer — does it work for me?",
    a: "Yes. The monitoring is identical: roster changes, coaching moves, graduating players at your position. Toggle 'College transfer' in onboarding and any drafts read as a current college player reaching out, not a high school intro.",
  },
  {
    q: "What about NCAA D1 contact rules?",
    a: "Watching rosters is always allowed — that's public information. Your athlete can also email D1 coaches anytime; what NCAA rules limit is when D1 coaches can reply directly (generally June 15 after sophomore year for most sports). D3 and NAIA don't have the same restrictions. See ncaa.org for the current calendar.",
  },
  {
    q: "What happens when my kid commits?",
    a: "Cancel anytime from your Account page (link in the top nav). Enter the email you used at checkout, you'll be sent to Stripe's secure billing portal where one click cancels. No hoops, no retention emails.",
  },
  {
    q: "Why $19.99/month?",
    a: "It's less than one tank of gas to a showcase. Recruiting is already costing your family thousands a year in club fees, camps, and travel — this is the cheap part that makes the rest of it land at the right schools at the right time. If it's not earning its keep, cancel in one click.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <div className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            For parents of college recruits
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            We watch every roster<br />on your kid&apos;s list.<br />
            <span className="text-brand-600">You&apos;ll know when a spot opens.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            A weekly roster tracker for recruiting families. We re-read every target school&apos;s
            roster, flag when players at your athlete&apos;s position are graduating, and catch
            coach changes — in one Sunday email.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SPORTS_COVERED.map((s) => (
              <span
                key={s}
                className="bg-white border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center">
            <BuyButton />
            <p className="text-xs text-gray-500 mt-4">
              $19.99/month. Secure checkout via Stripe. Cancel anytime, one click. Your first weekly digest arrives this Sunday at 7 AM Eastern.
            </p>
          </div>
        </div>
      </section>

      {/* Three bullets */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {BULLETS.map((b) => (
              <div key={b.title} className="bg-gray-50 rounded-2xl p-6">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works mockups */}
      <section className="py-20 md:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Here&apos;s what lands in your inbox every Sunday.
            </h2>
            <p className="text-base text-gray-600 mt-3 max-w-2xl mx-auto">
              One email a week. No notifications between. No dashboard you have to remember to check.
            </p>
          </div>

          {/* Mockup 1 — Position watch */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              1. Your position watch
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">SD</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">SignDay</div>
                    <div className="text-xs text-gray-500">to me · Sun, 7:00 AM</div>
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold text-gray-900">Weekly digest: Maya (2027, GK) — 8 schools watched</div>
              </div>
              <div className="p-6 space-y-5 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 mb-2">Position watch — goalkeeper, school by school</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• <span className="font-medium">Williams:</span> 1 of 3 goalkeepers graduates by spring 2027 — the class Maya would join. A spot should be opening.</li>
                    <li>• <span className="font-medium">Tufts:</span> 2 of 3 goalkeepers graduate by spring 2027. A spot should be opening.</li>
                    <li>• <span className="font-medium">Bowdoin:</span> All 3 goalkeepers are underclassmen through 2027 — expect tighter competition.</li>
                    <li>• <span className="font-medium">Amherst:</span> No goalkeepers listed on the current roster — often a recruiting priority.</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-2">What changed this week</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• Amherst hired a new goalkeeper coach.</li>
                    <li>• Wesleyan removed a senior keeper from the roster. Possible early departure.</li>
                    <li>• Williams posted Saturday&apos;s 4-1 win.</li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 ml-1 leading-relaxed">
              The same flags work for every sport we cover: graduating setters for a volleyball family, senior pitchers for a baseball family, keepers for soccer.
            </p>
          </div>

          {/* Mockup 2 — School tracker */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              2. Your school tracker
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Maya&apos;s schools (8 active)</div>
                <div className="text-xs text-gray-500">Updated Sun, 7:00 AM</div>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Williams</div>
                    <div className="text-xs text-gray-500">Spot opening at GK · 2027</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">Replied</span>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Tufts</div>
                    <div className="text-xs text-gray-500">2 keepers graduating by 2027</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Waiting 4d</span>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Bowdoin</div>
                    <div className="text-xs text-gray-500">Tight room at GK through 2027</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">Silent 21d</span>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Amherst</div>
                    <div className="text-xs text-gray-500">New coach hired last month</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">Coach changed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 3 — Bonus draft */}
          <div>
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              3. Bonus: when a door opens, a draft is ready
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 text-sm space-y-1">
                <div><span className="text-gray-500 w-16 inline-block">From:</span><span className="text-gray-900">maya.chen.27@gmail.com</span></div>
                <div><span className="text-gray-500 w-16 inline-block">To:</span><span className="text-gray-900">wsoccer@williams.edu</span></div>
                <div><span className="text-gray-500 w-16 inline-block">Subject:</span><span className="text-gray-900 font-semibold">2027 goalkeeper + Saturday&apos;s win</span></div>
              </div>
              <div className="p-6 text-sm text-gray-700 leading-relaxed space-y-3">
                <p>Hi Coach,</p>
                <p>Congrats on Saturday&apos;s 4-1 win against Wesleyan. I&apos;m Maya Chen, a 2027 goalkeeper with a 3.8 GPA, playing club in the ECNL. I know your senior keeper graduates in the spring, so I wanted to introduce myself ahead of next cycle.</p>
                <p>Updated reel here: [link]. I&apos;ll be at the New England ID Camp June 14-16 and could come to campus if your schedule allows.</p>
                <p>Best,<br />Maya</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 ml-1 leading-relaxed">
              Grounded in that program&apos;s real roster and results — no invented claims, no unfilled brackets. Your athlete edits it in their own voice and sends from their own Gmail. Included with every subscription.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-10 max-w-xl mx-auto">
            Previews of the actual weekly email and tracker. Onboarding takes 3 minutes; your first digest arrives this Sunday.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Simple pricing.</h2>
          <p className="text-lg text-gray-600 mb-10">One athlete. Up to 12 schools. One subscription.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Monthly</div>
              <div className="mt-2 flex items-baseline justify-center">
                <span className="text-4xl font-extrabold text-gray-900">$19.99</span>
                <span className="text-base text-gray-500 ml-1">/mo</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Cancel anytime, one click.</p>
            </div>

            {/* Annual */}
            <div className="bg-brand-600 rounded-2xl p-6 text-white relative">
              <div className="absolute -top-3 right-4 bg-white text-brand-700 rounded-full px-3 py-1 text-xs font-semibold">
                SAVE 38%
              </div>
              <div className="text-sm font-medium opacity-90 uppercase tracking-wider">Annual</div>
              <div className="mt-2 flex items-baseline justify-center">
                <span className="text-4xl font-extrabold">$149</span>
                <span className="text-base opacity-80 ml-1">/yr</span>
              </div>
              <p className="text-sm text-blue-100 mt-2">~$12.40/month. Save $91/year.</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <BuyButton />
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Secure checkout via Stripe. Cancel anytime, one click.
          </p>

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Cancel anytime.</h3>
                <p className="text-sm text-gray-700 mt-1">
                  No commitments, no contracts. One click from{" "}
                  <a href="/account" className="text-brand-600 hover:text-brand-700 underline">
                    your account page
                  </a>{" "}
                  opens Stripe&apos;s billing portal. If the tracker isn&apos;t earning its keep, you stop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Origin / proof */}
      <section className="py-20 md:py-24 bg-gradient-to-br from-brand-600 to-brand-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-4xl mb-4">⚽</div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Built by a dad in the middle of his own daughter&apos;s recruiting.
          </h2>
          <blockquote className="text-lg md:text-xl leading-relaxed text-blue-100 italic">
            &quot;I&apos;m a soccer dad. My daughter is Class of 2027, deep in college recruiting right now, and I was the one refreshing eight athletics sites every week, counting graduating keepers by hand. By day I trade at an investment bank, and I&apos;ve been doing a computer science master&apos;s at Georgia Tech, so I built the tracker I needed. Then families in other sports asked for it too.&quot;
          </blockquote>
          <p className="text-sm text-blue-200 mt-4">Tony, founder &middot; Future Think LLC</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-24 bg-gradient-to-br from-brand-50 to-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Stop counting graduating seniors by hand.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            $19.99/month, cancel anytime. Your first roster report arrives this Sunday at 7 AM Eastern.
          </p>
          <div className="flex justify-center">
            <BuyButton />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
