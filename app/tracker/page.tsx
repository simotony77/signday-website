import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TrackerBoard } from "@/components/TrackerBoard";

export const metadata = {
  title: "School tracker | SignDay",
  description: "Track where each coach conversation stands.",
};

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email || "";
  const token = params.token || "";

  return (
    <>
      <Nav />

      <section className="bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-6 md:pt-16 md:pb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Your school tracker
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            Mark where each coach conversation stands. Your weekly digest uses
            this to flag schools that have gone quiet and queue the right
            re-engagement drafts.
          </p>
        </div>
      </section>

      <section className="pb-20 md:pb-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <TrackerBoard initialEmail={initialEmail} token={token} />
        </div>
      </section>

      <Footer />
    </>
  );
}
