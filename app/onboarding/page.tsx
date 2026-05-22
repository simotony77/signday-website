import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { OnboardingForm } from "@/components/OnboardingForm";

export const metadata = {
  title: "Onboarding | SignDay",
  description: "Set up your SignDay agent in 3 minutes.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; mode?: string; token?: string }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email || "";
  const token = params.token || "";
  const isUpdateMode = params.mode === "update";

  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-6 md:pt-16 md:pb-8 text-center">
          <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
            {isUpdateMode ? "Update your setup" : "Welcome to SignDay"}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            {isUpdateMode
              ? "Edit your athlete and schools."
              : "Set up your agent in 3 minutes."}
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            {isUpdateMode
              ? "Add or remove schools, update athlete info, change your target division. Your changes take effect with this Sunday's digest."
              : "Tell me about your athlete and the schools you're tracking. Your first weekly digest arrives this Sunday at 7 AM Eastern."}
          </p>
        </div>
      </section>

      <section className="pb-20 md:pb-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <OnboardingForm initialEmail={initialEmail} token={token} />
        </div>
      </section>

      <Footer />
    </>
  );
}
