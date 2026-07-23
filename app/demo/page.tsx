import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DemoForm } from "@/components/DemoForm";

export const metadata = {
  title: "Try the SignDay agent",
  description:
    "See what SignDay finds for your athlete: real college rosters, position openings by grad year, and a personalized coach email. Soccer, volleyball, baseball, softball, lacrosse.",
};

export default function DemoPage() {
  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-6 md:pt-16 md:pb-8 text-center">
          <div className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
            See the agent run
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            See exactly what the agent does for your athlete every Sunday.
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            Pick your sport, tell us about your athlete, and choose a target
            school. The agent reads the real roster, shows who&apos;s graduating at
            your athlete&apos;s position, and drafts the outreach — the same thing it
            does for every school on your list, every week. Soccer, volleyball,
            baseball, softball, or lacrosse.
          </p>
        </div>
      </section>

      <section className="pb-8 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6">
            <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 text-center">
              What you&apos;ll see in 4 steps
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">👀</div>
                <div className="text-xs font-semibold text-gray-900">1. Monitoring</div>
                <div className="text-xs text-gray-500 leading-snug mt-1">
                  Roster, coaches, graduating players, and recent results
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs font-semibold text-gray-900">2. Position watch</div>
                <div className="text-xs text-gray-500 leading-snug mt-1">
                  Who&apos;s leaving at your athlete&apos;s position, and when a spot opens
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">✉️</div>
                <div className="text-xs font-semibold text-gray-900">3. Drafting</div>
                <div className="text-xs text-gray-500 leading-snug mt-1">
                  A coach email personalized to that program and your athlete
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">📬</div>
                <div className="text-xs font-semibold text-gray-900">4. Delivery</div>
                <div className="text-xs text-gray-500 leading-snug mt-1">
                  How it lands in your Sunday digest across every school you track
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <DemoForm />
        </div>
      </section>

      <Footer />
    </>
  );
}
