"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
    setEmail("");
  }

  return (
    <section
      className="py-14 px-4"
      style={{ background: "linear-gradient(135deg, #EAF2F0 0%, #E8EEF2 100%)" }}
    >
      <div className="max-w-xl mx-auto text-center">
        <div className="text-4xl mb-4">💌</div>
        <h2 className="text-2xl font-extrabold text-[#2A2320] mb-2">
          Stay in the Loop
        </h2>
        <p className="text-[#5E5450] text-sm leading-relaxed mb-6">
          Get early access to new arrivals, exclusive discounts, and gentle
          parenting tips — delivered to your inbox.
        </p>

        {submitted ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#5E9E8C] flex items-center justify-center text-white text-2xl shadow-md">
              ✓
            </div>
            <p className="font-bold text-[#2A2320]">You&apos;re on the list!</p>
            <p className="text-sm text-[#5E5450]">
              Welcome to the Loov family. Check your inbox for a little
              surprise. 🌿
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="your@email.com"
              className="flex-1 h-12 px-4 rounded-xl border-2 border-[#DDD5CC] bg-white text-[#2A2320] text-sm font-medium outline-none focus:border-[#5E9E8C] transition-colors placeholder:text-[#9A8E88]"
            />
            <Button type="submit" size="lg" className="whitespace-nowrap">
              Subscribe 🌿
            </Button>
          </form>
        )}

        {error && (
          <p className="text-red-500 text-xs font-semibold mt-2">{error}</p>
        )}

        {!submitted && (
          <p className="text-[10px] text-[#9A8E88] mt-3">
            No spam, ever. Unsubscribe anytime.
          </p>
        )}
      </div>
    </section>
  );
}
