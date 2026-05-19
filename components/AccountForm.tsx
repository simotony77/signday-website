"use client";

import { useState } from "react";

export function AccountForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter the email you used at checkout.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not open billing portal. Try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Try again in a minute.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="The email you used at checkout"
        required
        className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {loading ? "Opening billing portal..." : "Open billing portal"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">
        Opens Stripe&apos;s secure billing portal. Cancel, update payment method, or view invoices. No SignDay login required.
      </p>
    </form>
  );
}
