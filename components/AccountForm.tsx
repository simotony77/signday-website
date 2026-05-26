"use client";

import { useState } from "react";

export function AccountForm({
  initialEmail = "",
  token = "",
}: {
  initialEmail?: string;
  token?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState<"billing" | "setup" | "tracker" | "link" | null>(null);
  const [error, setError] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const hasToken = token.trim().length > 0;

  function validateEmail(): boolean {
    if (!email.trim()) {
      setError("Please enter the email you used at checkout.");
      return false;
    }
    setError("");
    return true;
  }

  // No token yet: email the customer a secure link.
  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail()) return;
    setLoading("link");
    try {
      const res = await fetch("/api/account/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not send the link. Try again.");
        setLoading(null);
        return;
      }
      setLinkSent(true);
      setLoading(null);
    } catch {
      setError("Network error. Try again in a minute.");
      setLoading(null);
    }
  }

  async function openBillingPortal() {
    setLoading("billing");
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not open billing portal. Try again.");
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again in a minute.");
      setLoading(null);
    }
  }

  function openUpdateSetup() {
    setLoading("setup");
    const url = `/onboarding?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}&token=${encodeURIComponent(token)}&mode=update`;
    window.location.href = url;
  }

  function openTracker() {
    setLoading("tracker");
    const url = `/tracker?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}&token=${encodeURIComponent(token)}`;
    window.location.href = url;
  }

  // ---- Token present: show the actions ----
  if (hasToken) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          You&apos;re verified as <span className="font-medium text-gray-900">{email}</span>.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openBillingPortal}
            disabled={loading !== null}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-xl transition-colors text-sm"
          >
            {loading === "billing" ? "Opening..." : "Manage billing"}
          </button>
          <button
            type="button"
            onClick={openUpdateSetup}
            disabled={loading !== null}
            className="bg-white border-2 border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-60 font-semibold px-4 py-3 rounded-xl transition-colors text-sm"
          >
            {loading === "setup" ? "Opening..." : "Update athlete + schools"}
          </button>
          <button
            type="button"
            onClick={openTracker}
            disabled={loading !== null}
            className="bg-white border-2 border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-60 font-semibold px-4 py-3 rounded-xl transition-colors text-sm sm:col-span-2"
          >
            {loading === "tracker" ? "Opening..." : "Open school tracker"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="text-xs text-gray-500 space-y-2 pt-2">
          <p>
            <span className="font-semibold text-gray-700">Manage billing</span> opens Stripe&apos;s secure portal. Cancel, update card, view invoices.
          </p>
          <p>
            <span className="font-semibold text-gray-700">Update athlete + schools</span> opens your setup prefilled. Changes apply with the next Sunday digest.
          </p>
          <p>
            <span className="font-semibold text-gray-700">School tracker</span> is where you mark each coach conversation (sent, replied, visit) so the digest can flag schools that have gone quiet.
          </p>
        </div>
      </div>
    );
  }

  // ---- No token: link sent confirmation ----
  if (linkSent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">📧</div>
        <h3 className="font-bold text-gray-900 mb-1">Check your email</h3>
        <p className="text-sm text-gray-700">
          If <span className="font-medium">{email}</span> has a SignDay account, we just sent a secure link to manage it. The link works for 24 hours.
        </p>
      </div>
    );
  }

  // ---- No token: request a link ----
  return (
    <form onSubmit={requestLink} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email used at checkout
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@email.com"
          required
          className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading !== null}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {loading === "link" ? "Sending..." : "Email me a secure link"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        For your athlete&apos;s privacy, we email you a secure link to verify it&apos;s your account before showing billing or athlete details. No password needed.
      </p>
    </form>
  );
}
