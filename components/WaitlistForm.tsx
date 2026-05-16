"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong. Try again.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Try again in a moment.");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">You&apos;re on the list.</h3>
        <p className="text-sm text-gray-700">
          Check your inbox in a minute. I sent you a quick reply with 3 questions so I can build for your situation specifically.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="parent@email.com"
        disabled={status === "submitting"}
        className="flex-1 rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        {status === "submitting" ? "Joining..." : "Join the waitlist"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 sm:absolute sm:mt-14">{errorMsg}</p>
      )}
    </form>
  );
}
