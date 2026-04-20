import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete My Account",
  description:
    "How to request deletion of your SignDay account and associated data.",
};

export default function DeleteAccountPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16 md:py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Delete Your Account
        </h1>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          We respect your right to delete your data. This page explains how to
          request deletion of your SignDay account and all associated data.
        </p>

        {/* Option 1: In-app */}
        <div className="bg-white border-2 border-brand-600 rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Option 1 — Delete from within the app (fastest)
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>Open the SignDay app on your device</li>
            <li>Sign in to your account</li>
            <li>
              Go to <strong>Settings → Delete my account</strong>
            </li>
            <li>Confirm the deletion</li>
          </ol>
          <p className="text-sm text-gray-500 mt-4">
            Your account and all associated data will be scheduled for deletion
            immediately. The deletion completes within 30 days.
          </p>
        </div>

        {/* Option 2: Email request */}
        <div className="bg-gray-50 rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Option 2 — Request deletion by email
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            If you cannot access the app or prefer to request deletion by email,
            send a message to the address below. We will respond within 5
            business days and complete deletion within 30 days of verification.
          </p>
          <a
            href="mailto:privacy@signdayapp.com?subject=Account%20Deletion%20Request&body=Hello%20SignDay%20Privacy%20Team%2C%0A%0AI%20would%20like%20to%20request%20deletion%20of%20my%20SignDay%20account%20and%20all%20associated%20data.%0A%0AAccount%20email%3A%20%5Bfill%20in%20the%20email%20address%20you%20used%20to%20register%5D%0A%0A(Optional)%20Reason%20for%20deletion%3A%20%5Bfill%20in%20or%20leave%20blank%5D%0A%0AThank%20you."
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Email privacy@signdayapp.com
          </a>
          <p className="text-sm text-gray-500 mt-4">
            Include your account email in the message so we can identify your
            account. We may ask additional verification questions to confirm
            your identity before completing the deletion.
          </p>
        </div>

        {/* What gets deleted */}
        <div className="rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            What data is deleted
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            When you delete your account, we permanently remove:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>Your email address and authentication credentials</li>
            <li>Athlete profile (name, graduation year, GPA, test scores, state)</li>
            <li>Recruiting Snapshot and AI-generated assessments</li>
            <li>All school tracker entries and notes</li>
            <li>Outreach log and AI-generated email drafts</li>
            <li>Recruiting milestones and calendar entries</li>
            <li>Push notification tokens</li>
            <li>Analytics identifiers and session history</li>
          </ul>
        </div>

        {/* What we retain */}
        <div className="rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            What we may retain
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            For legal and operational reasons, we retain a minimal set of data
            after deletion:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>
              <strong>Subscription records</strong> — Apple App Store and Google Play
              retain transaction records for tax and accounting purposes. We
              retain the associated customer identifier from RevenueCat for up
              to 7 years.
            </li>
            <li>
              <strong>Anonymized analytics</strong> — aggregate usage statistics
              that cannot be tied back to you.
            </li>
            <li>
              <strong>Security and fraud prevention records</strong> — where
              required by law.
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">
            None of this retained data is linked to your personal identity and
            cannot be used to identify you.
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Deletion timeline
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>
              <strong>Immediate:</strong> Your account becomes inaccessible
            </li>
            <li>
              <strong>Within 30 days:</strong> All personal data is permanently
              deleted from our production database
            </li>
            <li>
              <strong>Within 90 days:</strong> All personal data is removed from
              encrypted backups as they rotate out of the retention window
            </li>
          </ul>
        </div>

        {/* Cancel subscription note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            ⚠️ Cancel your subscription first
          </h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Deleting your SignDay account does <strong>not</strong>{" "}
            automatically cancel your subscription. Cancel your subscription
            separately before (or after) account deletion:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
            <li>
              <strong>iOS:</strong> Settings → [Your Name] → Subscriptions →
              SignDay → Cancel
            </li>
            <li>
              <strong>Android:</strong> Google Play Store → Profile → Payments
              &amp; Subscriptions → Subscriptions → SignDay → Cancel
            </li>
          </ul>
        </div>

        {/* Parent data */}
        <div className="rounded-2xl p-6 md:p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Minor athletes: parental rights
          </h2>
          <p className="text-gray-700 leading-relaxed">
            If your SignDay family account includes a minor athlete (age 13-17),
            the parent or legal guardian who created the Family Account may
            request review or deletion of the minor's data at any time using the
            same methods above. Include &ldquo;COPPA Request&rdquo; in the
            subject line to prioritize routing.
          </p>
        </div>

        {/* Contact */}
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">
            Questions? Contact{" "}
            <a
              href="mailto:privacy@signdayapp.com"
              className="text-brand-600 hover:underline font-medium"
            >
              privacy@signdayapp.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
