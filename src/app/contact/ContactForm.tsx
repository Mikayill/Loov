"use client";

import { useState } from "react";
import CsrfField from "@/components/CsrfField";
import { useLocale } from "@/context/LocaleContext";
import Button from "@/components/ui/Button";

type Field = { name: string; email: string; subject: string; message: string };
const empty: Field = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const { t } = useLocale();
  const [form, setForm]       = useState<Field>(empty);
  const [errors, setErrors]   = useState<Partial<Field>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [sendError, setSendError] = useState("");
  const [honeypot, setHoneypot]   = useState("");

  const subjects = [
    t("contact.form.subjectOrderInquiry"),
    t("contact.form.subjectProductQuestion"),
    t("contact.form.subjectShippingDelivery"),
    t("contact.form.subjectReturnExchange"),
    t("contact.form.subjectWholesaleBulk"),
    t("contact.form.subjectOther"),
  ];

  function validate(): boolean {
    const e: Partial<Field> = {};
    if (!form.name.trim())    e.name    = t("contact.form.nameRequired");
    if (!form.email.trim())   e.email   = t("contact.form.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                              e.email   = t("contact.form.validEmail");
    if (!form.subject)        e.subject = t("contact.form.chooseSubject");
    if (!form.message.trim()) e.message = t("contact.form.messageRequired");
    else if (form.message.trim().length < 10)
                              e.message = t("contact.form.messageMin10");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof Field]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSendError("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: honeypot }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setSent(true);
      else setSendError(d.error || t("contact.form.sendFailed"));
    } catch {
      setSendError(t("contact.form.sendFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-accent-soft border-2 border-sage rounded-3xl p-10 text-center h-full flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-3xl text-white shadow">
          ✓
        </div>
        <h3 className="text-xl font-extrabold text-ink">{t("contact.form.sentTitle")}</h3>
        <p className="text-ink-soft text-sm leading-relaxed max-w-xs">
          {t("contact.form.sentBody").split("{name}")[0]}<strong>{form.name}</strong>
          {t("contact.form.sentBody").split("{name}")[1].split("{email}")[0]}<strong>{form.email}</strong>
          {t("contact.form.sentBody").split("{name}")[1].split("{email}")[1]}
        </p>
        <button
          onClick={() => { setForm(empty); setSent(false); }}
          className="text-sm font-bold text-accent hover:underline mt-2"
        >
          {t("contact.form.sendAnother")}
        </button>
      </div>
    );
  }

  const inputBase =
    "w-full border-2 rounded-control px-4 py-3 text-sm font-medium text-ink placeholder-[#C8B8B0] focus:outline-none transition-colors bg-white";
  const inputOk  = "border-line focus:border-accent";
  const inputErr = "border-red-300 focus:border-red-400 bg-red-50";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-ink-soft uppercase tracking-widest mb-1.5">
          {t("contact.form.fullName")} <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Nino Beridze"
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
          className={`${inputBase} ${errors.name ? inputErr : inputOk}`}
        />
        {errors.name && <p id="contact-name-error" className="text-xs text-red-400 mt-1 font-semibold">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold text-ink-soft uppercase tracking-widest mb-1.5">
          {t("contact.form.emailAddress")} <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={handleChange}
          placeholder="e.g. nino@email.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
        />
        {errors.email && <p id="contact-email-error" className="text-xs text-red-400 mt-1 font-semibold">{errors.email}</p>}
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-bold text-ink-soft uppercase tracking-widest mb-1.5">
          {t("contact.form.subject")} <span className="text-red-400">*</span>
        </label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          className={`${inputBase} ${errors.subject ? inputErr : inputOk} cursor-pointer`}
        >
          <option value="">{t("contact.form.selectTopic")}</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.subject && <p className="text-xs text-red-400 mt-1 font-semibold">{errors.subject}</p>}
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-bold text-ink-soft uppercase tracking-widest mb-1.5">
          {t("contact.form.message")} <span className="text-red-400">*</span>
        </label>
        <textarea
          name="message"
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder={t("contact.form.messagePlaceholder")}
          className={`${inputBase} ${errors.message ? inputErr : inputOk} resize-none`}
        />
        <div className="flex items-center justify-between mt-1">
          {errors.message
            ? <p className="text-xs text-red-400 font-semibold">{errors.message}</p>
            : <span />}
          <span className="text-xs text-ink-muted">{form.message.length} / 500</span>
        </div>
      </div>

      {/* CSRF placeholder — server validation in Phase 2 */}
      <CsrfField />

      {/* Honeypot — invisible to humans, bots fill it and get silently dropped */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-0 w-0 opacity-0"
      />

      {sendError && (
        <p className="text-sm text-red-500 font-semibold bg-red-50 border border-red-200 rounded-control px-4 py-3">
          {sendError}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        loading={loading}
        loadingText={t("contact.form.sending")}
        fullWidth
        className="!rounded-card !h-auto py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {t("contact.form.sendMessage")} →
      </Button>
    </form>
  );
}
