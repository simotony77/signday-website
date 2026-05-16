import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WaitlistForm } from "@/components/WaitlistForm";

const BULLETS = [
  {
    icon: "🔍",
    title: "We watch your target schools",
    body: "Graduating seniors at the position. New coaches. Schedule openings. Depth changes on the roster. We monitor 10–15 programs every week so you stop refreshing athletics sites at midnight.",
  },
  {
    icon: "✉️",
    title: "We draft personalized outreach",
    body: "Coach by coach, tailored to each program — graduating positions, recent results, the program's style. Drafts arrive in your inbox, ready for your approval, sent from your athlete's own email so coaches actually read them.",
  },
  {
    icon: "🔁",
    title: "We chase the follow-ups",
    body: "Every stalled thread, every Sunday digest. We track what coaches say, when they go silent, and queue the right follow-up at the right time — until your daughter commits.",
  },
];

const FAQ = [
  {
    q: "What sports does it cover?",
    a: "D3 women's soccer to start. Expanding from there once we've nailed it for D3 families.",
  },
  {
    q: "Who actually sends the emails?",
    a: "You do. Drafts arrive in your inbox; you click \"Send via Gmail\" from your athlete's account. That's why coaches actually read them — mail from a real Gmail address gets through, mail from broadcast platforms gets buried.",
  },
  {
    q: "Won't coaches notice it's templated?",
    a: "Each draft is researched per coach and program — graduating positions, recent results, the program's style. You always edit before sending. The point isn't to fake personal — it's to make personal fast.",
  },
  {
    q: "What happens when my kid commits?",
    a: "Cancel anytime, one click. No hoops, no retention emails.",
  },
  {
    q: "Why only D3 right now?",
    a: "That's the world I'm in with my daughter. Class of 2027 keeper, ACT 30, navigating D3 fits right now. We'll add D2 and D1 once we've nailed it for D3 families.",
  },
  {
    q: "Why $99/month?",
    a: "Recruiting is already costing your family $10K+/year in club fees, ID camps, and travel. SignDay turns 5 hours of weekly admin work into 15 minutes of approving drafts. If we don't get you at least 5 substantive coach responses in 90 days, we refund every dollar.",
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
            For parents of D3 women&apos;s soccer recruits
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            The recruiting work<br />you don&apos;t have time to do —<br />
            <span className="text-brand-600">done for you.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
            An AI assistant for parents of D3 women&apos;s soccer recruits. We monitor your target schools,
            draft outreach to coaches, and chase follow-ups — so you can stop spending Sundays in your daughter&apos;s recruiting spreadsheet.
          </p>

          <div className="mt-10">
            <WaitlistForm />
            <p className="text-xs text-gray-500 mt-4">
              Drop your email — I&apos;ll reply with 3 quick questions so I can build for your situation specifically.
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
              Here&apos;s what your inbox will look like.
            </h2>
            <p className="text-base text-gray-600 mt-3 max-w-2xl mx-auto">
              Three things, every week. No notifications between. No dashboard you have to remember to check.
            </p>
          </div>

          {/* Mockup 1 — Sunday digest */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              1. Sunday morning digest
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">SD</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">SignDay</div>
                    <div className="text-xs text-gray-500">to me · Sun May 17, 7:00 AM</div>
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold text-gray-900">Your weekly digest — Maya, 4 weeks to summer ID camps</div>
              </div>
              <div className="p-6 space-y-5 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 mb-2">3 things changed this week</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• Williams head coach posted Saturday&apos;s 4-1 win. Good moment to reach out.</li>
                    <li>• Tufts senior center-mid graduating spring 2027. They&apos;ll be looking at the position.</li>
                    <li>• Bowdoin announced 2 new midfielder commits for Class of 2026. May slow our timeline there.</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-2">3 drafts waiting for your approval</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• Williams — congrats-on-win follow-up</li>
                    <li>• Tufts — position-transition interest</li>
                    <li>• Carleton — 21-day re-engagement</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-2">2 schools quiet (21+ days)</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• Pomona — no reply since April 14. Suggest dropping or one more attempt.</li>
                    <li>• Amherst — coach changed last month. Restart sequence?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 2 — Coach draft */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              2. Drafts your athlete approves and sends
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 text-sm space-y-1">
                <div><span className="text-gray-500 w-16 inline-block">From:</span><span className="text-gray-900">maya.chen.27@gmail.com</span></div>
                <div><span className="text-gray-500 w-16 inline-block">To:</span><span className="text-gray-900">wsoccer@williams.edu</span></div>
                <div><span className="text-gray-500 w-16 inline-block">Subject:</span><span className="text-gray-900 font-semibold">Saturday&apos;s win + Class of 2027 midfielder follow-up</span></div>
              </div>
              <div className="p-6 text-sm text-gray-700 leading-relaxed space-y-3">
                <p>Hi Coach,</p>
                <p>Congrats on Saturday&apos;s 4-1 win against Wesleyan. Saw the second-half stretch where your midfield locked it down at 3-1. Composed under pressure.</p>
                <p>I&apos;m Maya Chen, a 2027 central midfielder with a 3.8 GPA and 1380 SAT, playing club in the ECNL. I emailed in March about Williams and your reply mentioned the midfield transition coming with your senior graduating spring 2027. That stayed with me. I&apos;ve been working specifically on tempo control and switching the field, areas your team&apos;s style leans into.</p>
                <p>Updated reel and academic transcript here: [link]. I&apos;ll be at the New England ID Camp June 14–16 and could come up to campus if your schedule allows. Otherwise happy to Zoom whenever works.</p>
                <p>Best,<br />Maya</p>
              </div>
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex flex-wrap gap-2">
                <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                  Edit &amp; send via Gmail
                </button>
                <button className="bg-white border border-gray-200 hover:border-gray-300 text-sm text-gray-700 px-4 py-2 rounded-lg">
                  Re-draft
                </button>
                <button className="bg-white border border-gray-200 hover:border-gray-300 text-sm text-gray-700 px-4 py-2 rounded-lg">
                  Skip this week
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 ml-1 leading-relaxed">
              Every draft pulls real research: graduating seniors at the position, the program&apos;s recent results, the coach&apos;s recent commits. Then your athlete edits in her voice and sends from her own Gmail. No SignDay tracking URL. No generic boilerplate. No unfilled brackets.
            </p>
          </div>

          {/* Mockup 3 — School tracker */}
          <div>
            <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 ml-1">
              3. Your school tracker
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Maya&apos;s schools — 8 active</div>
                <div className="text-xs text-gray-500">Updated Sun May 17, 7:00 AM</div>
              </div>
              <div className="divide-y divide-gray-100">
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Williams</div>
                    <div className="text-xs text-gray-500">Last reply: 4 days ago</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">Replied</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Send win follow-up</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Tufts</div>
                    <div className="text-xs text-gray-500">Awaiting response</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Waiting 4d</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Hold until Friday</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Bowdoin</div>
                    <div className="text-xs text-gray-500">Visit invite received</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">Replied</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Confirm June visit</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Carleton</div>
                    <div className="text-xs text-gray-500">Sent April 23</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">Silent 21d</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Re-engagement draft ready</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Middlebury</div>
                    <div className="text-xs text-gray-500">Awaiting response</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">Waiting 8d</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Auto follow-up Tuesday</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Pomona</div>
                    <div className="text-xs text-gray-500">Sent April 14</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 whitespace-nowrap">Silent 33d</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Suggest dropping</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Amherst</div>
                    <div className="text-xs text-gray-500">New coach hired</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">Coach changed</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">Restart sequence</div>
                </div>
                <div className="px-6 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">Macalester</div>
                    <div className="text-xs text-gray-500">First contact pending</div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">Not yet contacted</span>
                  <div className="hidden sm:block text-xs text-gray-600 w-44 text-right">First-touch draft ready</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-10 max-w-xl mx-auto">
            Previews of the experience. SignDay is in early access, onboarding the first families this month.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Simple pricing.</h2>
          <p className="text-lg text-gray-600 mb-10">One agent. One athlete. One subscription.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Monthly</div>
              <div className="mt-2 flex items-baseline justify-center">
                <span className="text-4xl font-extrabold text-gray-900">$99</span>
                <span className="text-base text-gray-500 ml-1">/mo</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Cancel anytime, one click.</p>
            </div>

            {/* Annual */}
            <div className="bg-brand-600 rounded-2xl p-6 text-white relative">
              <div className="absolute -top-3 right-4 bg-white text-brand-700 rounded-full px-3 py-1 text-xs font-semibold">
                SAVE 33%
              </div>
              <div className="text-sm font-medium opacity-90 uppercase tracking-wider">Annual</div>
              <div className="mt-2 flex items-baseline justify-center">
                <span className="text-4xl font-extrabold">$799</span>
                <span className="text-base opacity-80 ml-1">/yr</span>
              </div>
              <p className="text-sm text-blue-100 mt-2">~$66/month — save $389/year.</p>
            </div>
          </div>

          <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-5 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">90-day outcome guarantee</h3>
                <p className="text-sm text-gray-700 mt-1">
                  If we don&apos;t get you at least 5 substantive coach responses in 90 days, full refund. No questions asked.
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
            Built by a dad in the middle of his daughter&apos;s D3 keeper recruiting.
          </h2>
          <blockquote className="text-lg md:text-xl leading-relaxed text-blue-100 italic">
            &quot;I&apos;m a soccer dad. My daughter Chloe is Class of 2027, a keeper, with a 30 ACT and 12+ programs on her list.
            I built SignDay because I couldn&apos;t keep up with the work — the rosters, the emails, the follow-ups.
            This is the tool I needed.&quot;
          </blockquote>
          <p className="text-sm text-blue-200 mt-4">— Tony, Future Think LLC</p>
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
            Stop spending Sundays in your daughter&apos;s recruiting spreadsheet.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Drop your email. I&apos;ll reply within 24 hours.
          </p>
          <WaitlistForm />
        </div>
      </section>

      <Footer />
    </>
  );
}
