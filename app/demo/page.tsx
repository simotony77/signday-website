import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DemoForm } from "@/components/DemoForm";

export const metadata = {
  title: "Try the SignDay agent",
  description:
    "See what the SignDay AI agent would draft for your athlete. Real D3 women's soccer programs, real rosters, real personalized coach emails.",
};

export default function DemoPage() {
  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 md:pt-16 md:pb-10 text-center">
          <div className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
            Try the agent
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            See what your daughter would send to a real D3 coach.
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            Tell us about your athlete and pick a target school. The SignDay agent uses that program&apos;s actual roster and coaching staff to draft a personalized coach email. No fake data, no placeholders, no AI tells.
          </p>
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
