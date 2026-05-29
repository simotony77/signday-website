import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DemoForm } from "@/components/DemoForm";

export const metadata = {
  title: "Try the SignDay agent",
  description:
    "See what the SignDay AI agent would draft for your athlete. Real college soccer programs, real rosters, real personalized coach emails.",
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
            Tell us about your athlete and pick a target school. The agent walks you through the full pipeline: monitoring the program, detecting what changed, drafting the outreach, and delivering it in your Sunday digest. Real roster data, real coaches, no placeholders.
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
                  Roster, coaches, graduating seniors, and recent results
                </div>
              </div>
              <div>
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs font-semibold text-gray-900">2. Detection</div>
                <div className="text-xs text-gray-500 leading-snug mt-1">
                  A roster change or a recent win the agent surfaced
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
