"use client";

import { useState } from "react";

export function AccountForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState<"billing" | "setup" | null>(null);
  const [error, setError] = useState("");

  function validateEmail(): boolean {
    if (!email.trim()) {
      setError("Please enter the email you used at checkout.");
      return false;
    }
    setError("");
    return true;
  }

  async function openBillingPortal() {
    if (!validateEmail()) return;
    setLoading("billing");
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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
    if (!validateEmail()) return;
    setLoading("setup");
    const url = `/onboarding?email=${encodeURIComponent(
      email.trim().toLowerCase()
    )}&mode=update`;
    window.location.href = url;
  }

  return (
    <div className="space-y-5">
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
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="text-xs text-gray-500 space-y-2 pt-2">
        <p>
          <span className="font-semibold text-gray-700">Manage billing</span> opens Stripe&apos;s secure portal. Cancel, update card, view invoices.
        </p>
        <p>
          <span className="font-semibold text-gray-700">Update athlete + schools</span> opens your onboarding form prefilled with your current setup. Add or remove schools any time; changes apply with the next Sunday digest.
        </p>
      </div>
    </div>
  );
}
