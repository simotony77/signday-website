"use client";

import { useEffect, useState } from "react";

const REF_STORAGE = "signday_ref";

export function BuyButton({
  className,
  label = "Get SignDay — $39/month",
}: {
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Capture a ?ref= referral code on load and remember it through checkout.
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) localStorage.setItem(REF_STORAGE, ref.slice(0, 32));
    } catch {
      /* ignore */
    }
  }, []);

  async function handleClick() {
    setLoading(true);
    setError("");

    let ref = "";
    try {
      ref = localStorage.getItem(REF_STORAGE) || "";
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout. Try again.");
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
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ||
          "bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        }
      >
        {loading ? "Loading checkout..." : label}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
