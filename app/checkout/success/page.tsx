import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Welcome to SignDay",
  description: "Your SignDay subscription is active. Check your inbox for onboarding.",
};

export default function CheckoutSuccessPage() {
  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-20 text-center">
          <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            Subscription active
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Welcome to SignDay.
          </h1>
          <p className="text-lg text-gray-600 mt-5 leading-relaxed">
            Your $99/month subscription is active. Check your inbox in a minute. I&apos;ve sent you a quick onboarding form so I can set up the agent for your athlete and your specific school list. Your first weekly digest arrives this Sunday.
          </p>

          <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 text-left shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">What happens next</h2>
            <ol className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <li>
                <span className="font-semibold text-gray-900">1. Check your email.</span> I sent you an onboarding link from <code>tony@signdayapp.com</code>. Takes about 3 minutes to fill in your athlete&apos;s details and the schools you&apos;re tracking.
              </li>
              <li>
                <span className="font-semibold text-gray-900">2. I review your setup.</span> For the first 5 customers I&apos;m onboarding personally. I&apos;ll check your school list, sanity-check the agent&apos;s output for your athlete, and email back with any questions.
              </li>
              <li>
                <span className="font-semibold text-gray-900">3. First digest this Sunday.</span> 7:00 AM Eastern. Coverage of every school you tracked, drafts ready for your approval, sent from your athlete&apos;s own Gmail.
              </li>
            </ol>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            Didn&apos;t get the onboarding email? Check spam, or email me at{" "}
            <a href="mailto:tony@signdayapp.com" className="text-brand-600 hover:underline">
              tony@signdayapp.com
            </a>
            .
          </p>

          <Link
            href="/"
            className="inline-block mt-8 text-sm text-gray-500 hover:text-brand-600 underline"
          >
            Back to the homepage
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
