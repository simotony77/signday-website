import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AccountForm } from "@/components/AccountForm";

export const metadata = {
  title: "Account | SignDay",
  description: "Manage your SignDay subscription. Cancel anytime.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email || "";
  const justReturned = params.ok === "1";

  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-8 md:pt-20 md:pb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Manage your subscription
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-xl mx-auto leading-relaxed">
            Cancel, update your payment method, or view invoices. One click, no hoops.
          </p>
        </div>
      </section>

      <section className="pb-20 md:pb-24 bg-white">
        <div className="max-w-md mx-auto px-6">
          {justReturned && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-sm text-green-800">
              You&apos;re back from the billing portal. Any changes you made are saved.
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <AccountForm initialEmail={initialEmail} />
          </div>
          <p className="text-xs text-gray-500 mt-6 text-center">
            Trouble? Email{" "}
            <a
              href="mailto:tony@signdayapp.com"
              className="text-brand-600 hover:text-brand-700"
            >
              tony@signdayapp.com
            </a>{" "}
            and I&apos;ll cancel for you manually.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
