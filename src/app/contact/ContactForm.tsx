"use client";

import { useState } from "react";
import CsrfField from "@/components/CsrfField";
import { useLocale } from "@/context/LocaleContext";

type Field = { name: string; email: string; subject: string; message: string };
const empty: Field = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const { t } = useLocale();
  const [form, setForm]       = useState<Field>(empty);
  const [errors, setErrors]   = useState<Partial<Field>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

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
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1600)); // simulate API
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-[#EAF2F0] border-2 border-[#C8DDD8] rounded-3xl p-10 text-center h-full flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#5E9E8C] flex items-center justify-center text-3xl text-white shadow">
          ✓
        </div>
        <h3 className="text-xl font-extrabold text-[#2A2320]">{t("contact.form.sentTitle")}</h3>
        <p className="text-[#5E5450] text-sm leading-relaxed max-w-xs">
          {t("contact.form.sentBody").split("{name}")[0]}<strong>{form.name}</strong>
          {t("contact.form.sentBody").split("{name}")[1].split("{email}")[0]}<strong>{form.email}</strong>
          {t("contact.form.sentBody").split("{name}")[1].split("{email}")[1]}
        </p>
        <button
          onClick={() => { setForm(empty); setSent(false); }}
          className="text-sm font-bold text-[#5E9E8C] hover:underline mt-2"
        >
          {t("contact.form.sendAnother")}
        </button>
      </div>
    );
  }

  const inputBase =
    "w-full border-2 rounded-xl px-4 py-3 text-sm font-medium text-[#2A2320] placeholder-[#C8B8B0] focus:outline-none transition-colors bg-white";
  const inputOk  = "border-[#DDD5CC] focus:border-[#5E9E8C]";
  const inputErr = "border-red-300 focus:border-red-400 bg-red-50";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-[#5E5450] uppercase tracking-widest mb-1.5">
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
        <label className="block text-xs font-bold text-[#5E5450] uppercase tracking-widest mb-1.5">
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
        <label className="block text-xs font-bold text-[#5E5450] uppercase tracking-widest mb-1.5">
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
        <label className="block text-xs font-bold text-[#5E5450] uppercase tracking-widest mb-1.5">
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
          <span className="text-xs text-[#9A8E88]">{form.message.length} / 500</span>
        </div>
      </div>

      {/* CSRF placeholder — server validation in Phase 2 */}
      <CsrfField />

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E9E8C] focus-visible:ring-offset-2"
        style={{ backgroundColor: "#5E9E8C" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t("contact.form.sending")}
          </>
        ) : (
          `${t("contact.form.sendMessage")} →`
        )}
      </button>
    </form>
  );
}
