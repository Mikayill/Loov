/**
 * Order confirmation message templates (thank-you + tracking code).
 *
 * These are ready for the backend (Phase 2) to send by email / SMS. The message
 * is generated in the language the customer used on the site — pass the active
 * locale (from LocaleContext) into `buildOrderMessage`.
 *
 * Frontend note: the checkout success screen renders a live preview of the
 * exact message that will be sent, so the wording/translation is verifiable now.
 */

import type { Locale } from "./config";

export interface OrderMessageParams {
  name: string;
  orderNum: string;
  /** Optional public tracking URL, e.g. https://loov.ge/track-order?id=... */
  trackUrl?: string;
}

export interface OrderMessage {
  /** Email subject line */
  subject: string;
  /** Short SMS-friendly body */
  sms: string;
  /** Full email body */
  email: string;
}

type Builder = (p: OrderMessageParams) => OrderMessage;

const builders: Partial<Record<Locale, Builder>> = {
  en: ({ name, orderNum, trackUrl }) => ({
    subject: `Thank you, ${name}! Your Loov order is confirmed 🌿`,
    sms: `Loov: Thanks ${name}! Order ${orderNum} confirmed. Track: ${trackUrl ?? `loov.ge/track-order`} (code ${orderNum}).`,
    email:
      `Hi ${name},\n\n` +
      `Thank you for shopping with Loov! 🌿 Your order has been received and our team will contact you within 24 hours to confirm delivery.\n\n` +
      `Your tracking code: ${orderNum}\n` +
      `Track your order: ${trackUrl ?? "https://loov.ge/track-order"}\n\n` +
      `With love,\nThe Loov Team`,
  }),
  ka: ({ name, orderNum, trackUrl }) => ({
    subject: `გმადლობთ, ${name}! თქვენი Loov-ს შეკვეთა დადასტურდა 🌿`,
    sms: `Loov: გმადლობთ, ${name}! შეკვეთა ${orderNum} დადასტურდა. თვალთვალი: ${trackUrl ?? `loov.ge/track-order`} (კოდი ${orderNum}).`,
    email:
      `გამარჯობა ${name},\n\n` +
      `გმადლობთ Loov-ს არჩევისთვის! 🌿 თქვენი შეკვეთა მიღებულია და ჩვენი გუნდი დაგიკავშირდებათ 24 საათის განმავლობაში მიწოდების დასადასტურებლად.\n\n` +
      `თქვენი თვალთვალის კოდი: ${orderNum}\n` +
      `თვალი ადევნეთ შეკვეთას: ${trackUrl ?? "https://loov.ge/track-order"}\n\n` +
      `სიყვარულით,\nLoov-ს გუნდი`,
  }),
  ru: ({ name, orderNum, trackUrl }) => ({
    subject: `Спасибо, ${name}! Ваш заказ Loov подтверждён 🌿`,
    sms: `Loov: Спасибо, ${name}! Заказ ${orderNum} подтверждён. Отслеживание: ${trackUrl ?? `loov.ge/track-order`} (код ${orderNum}).`,
    email:
      `Здравствуйте, ${name},\n\n` +
      `Спасибо за покупку в Loov! 🌿 Ваш заказ получен, и наша команда свяжется с вами в течение 24 часов для подтверждения доставки.\n\n` +
      `Ваш код отслеживания: ${orderNum}\n` +
      `Отследить заказ: ${trackUrl ?? "https://loov.ge/track-order"}\n\n` +
      `С любовью,\nКоманда Loov`,
  }),
  tr: ({ name, orderNum, trackUrl }) => ({
    subject: `Teşekkürler, ${name}! Loov siparişiniz onaylandı 🌿`,
    sms: `Loov: Teşekkürler ${name}! ${orderNum} numaralı siparişiniz onaylandı. Takip: ${trackUrl ?? `loov.ge/track-order`} (kod ${orderNum}).`,
    email:
      `Merhaba ${name},\n\n` +
      `Loov'dan alışveriş yaptığınız için teşekkürler! 🌿 Siparişiniz alındı ve ekibimiz teslimatı onaylamak için 24 saat içinde sizinle iletişime geçecek.\n\n` +
      `Takip kodunuz: ${orderNum}\n` +
      `Siparişinizi takip edin: ${trackUrl ?? "https://loov.ge/track-order"}\n\n` +
      `Sevgiyle,\nLoov Ekibi`,
  }),
};

/** Build the order confirmation message in the customer's language (falls back to English). */
export function buildOrderMessage(locale: Locale, params: OrderMessageParams): OrderMessage {
  const builder = builders[locale] ?? builders.en!;
  return builder(params);
}

/* ════════════════════════════════════════════════════════════════
   Status-update emails — sent when the admin changes an order's
   status (processing / shipped / delivered / cancelled).
   ════════════════════════════════════════════════════════════════ */

export type OrderStatusKey = "processing" | "shipped" | "delivered" | "cancelled";

interface StatusCopy {
  subject: string;
  body: string;
}

type StatusBuilder = (p: OrderMessageParams) => Record<OrderStatusKey, StatusCopy>;

const statusBuilders: Partial<Record<Locale, StatusBuilder>> = {
  en: ({ name, orderNum, trackUrl }) => {
    const track = trackUrl ?? "https://loov.ge/track-order";
    const sign = `\n\nWith love,\nThe Loov Team`;
    return {
      processing: {
        subject: `Your Loov order ${orderNum} is being prepared 📦`,
        body: `Hi ${name},\n\nGood news — we're preparing your order ${orderNum} right now. We'll let you know the moment it ships.\n\nTrack your order: ${track}${sign}`,
      },
      shipped: {
        subject: `Your Loov order ${orderNum} is on its way 🚀`,
        body: `Hi ${name},\n\nYour order ${orderNum} has shipped and is on its way to you! Expected delivery: 1–3 business days.\n\nTrack your order: ${track}${sign}`,
      },
      delivered: {
        subject: `Your Loov order ${orderNum} was delivered 🎉`,
        body: `Hi ${name},\n\nYour order ${orderNum} has been delivered — we hope your little one loves it! 🌿\n\nIf anything isn't right, just reply to this email and we'll sort it out.\n\nP.S. Signed-in customers can review their products on the product page.${sign}`,
      },
      cancelled: {
        subject: `Your Loov order ${orderNum} was cancelled`,
        body: `Hi ${name},\n\nYour order ${orderNum} has been cancelled. If you paid online, the refund will be processed within 3–5 business days.\n\nIf this was unexpected, reply to this email and we'll help right away.${sign}`,
      },
    };
  },
  ka: ({ name, orderNum, trackUrl }) => {
    const track = trackUrl ?? "https://loov.ge/track-order";
    const sign = `\n\nსიყვარულით,\nLoov-ს გუნდი`;
    return {
      processing: {
        subject: `თქვენი Loov-ს შეკვეთა ${orderNum} მზადდება 📦`,
        body: `გამარჯობა ${name},\n\nკარგი ამბავი — თქვენს შეკვეთას ${orderNum} ახლა ვამზადებთ. შეგატყობინებთ, როგორც კი გაიგზავნება.\n\nთვალი ადევნეთ შეკვეთას: ${track}${sign}`,
      },
      shipped: {
        subject: `თქვენი Loov-ს შეკვეთა ${orderNum} გზაშია 🚀`,
        body: `გამარჯობა ${name},\n\nთქვენი შეკვეთა ${orderNum} გაიგზავნა და გზაშია! სავარაუდო მიწოდება: 1–3 სამუშაო დღე.\n\nთვალი ადევნეთ შეკვეთას: ${track}${sign}`,
      },
      delivered: {
        subject: `თქვენი Loov-ს შეკვეთა ${orderNum} ჩაბარდა 🎉`,
        body: `გამარჯობა ${name},\n\nთქვენი შეკვეთა ${orderNum} ჩაბარდა — იმედია, პატარას ძალიან მოეწონება! 🌿\n\nთუ რამე ისე არ არის, უბრალოდ უპასუხეთ ამ წერილს და მოვაგვარებთ.${sign}`,
      },
      cancelled: {
        subject: `თქვენი Loov-ს შეკვეთა ${orderNum} გაუქმდა`,
        body: `გამარჯობა ${name},\n\nთქვენი შეკვეთა ${orderNum} გაუქმდა. თუ ონლაინ გადაიხადეთ, თანხა 3–5 სამუშაო დღეში დაბრუნდება.\n\nთუ ეს მოულოდნელი იყო, გვიპასუხეთ და დაუყოვნებლივ დაგეხმარებით.${sign}`,
      },
    };
  },
  ru: ({ name, orderNum, trackUrl }) => {
    const track = trackUrl ?? "https://loov.ge/track-order";
    const sign = `\n\nС любовью,\nКоманда Loov`;
    return {
      processing: {
        subject: `Ваш заказ Loov ${orderNum} готовится 📦`,
        body: `Здравствуйте, ${name},\n\nХорошие новости — мы уже готовим ваш заказ ${orderNum}. Сообщим, как только он будет отправлен.\n\nОтследить заказ: ${track}${sign}`,
      },
      shipped: {
        subject: `Ваш заказ Loov ${orderNum} в пути 🚀`,
        body: `Здравствуйте, ${name},\n\nВаш заказ ${orderNum} отправлен и уже в пути! Ожидаемая доставка: 1–3 рабочих дня.\n\nОтследить заказ: ${track}${sign}`,
      },
      delivered: {
        subject: `Ваш заказ Loov ${orderNum} доставлен 🎉`,
        body: `Здравствуйте, ${name},\n\nВаш заказ ${orderNum} доставлен — надеемся, малышу понравится! 🌿\n\nЕсли что-то не так, просто ответьте на это письмо, и мы всё исправим.${sign}`,
      },
      cancelled: {
        subject: `Ваш заказ Loov ${orderNum} отменён`,
        body: `Здравствуйте, ${name},\n\nВаш заказ ${orderNum} отменён. Если вы оплатили онлайн, возврат будет обработан в течение 3–5 рабочих дней.\n\nЕсли это неожиданно, ответьте на это письмо — мы сразу поможем.${sign}`,
      },
    };
  },
  tr: ({ name, orderNum, trackUrl }) => {
    const track = trackUrl ?? "https://loov.ge/track-order";
    const sign = `\n\nSevgiyle,\nLoov Ekibi`;
    return {
      processing: {
        subject: `Loov siparişiniz ${orderNum} hazırlanıyor 📦`,
        body: `Merhaba ${name},\n\nGüzel haber — ${orderNum} numaralı siparişinizi şu an hazırlıyoruz. Kargoya verilir vermez size haber vereceğiz.\n\nSiparişinizi takip edin: ${track}${sign}`,
      },
      shipped: {
        subject: `Loov siparişiniz ${orderNum} yolda 🚀`,
        body: `Merhaba ${name},\n\n${orderNum} numaralı siparişiniz kargoya verildi ve size doğru yolda! Tahmini teslimat: 1–3 iş günü.\n\nSiparişinizi takip edin: ${track}${sign}`,
      },
      delivered: {
        subject: `Loov siparişiniz ${orderNum} teslim edildi 🎉`,
        body: `Merhaba ${name},\n\n${orderNum} numaralı siparişiniz teslim edildi — minik bebeğinizin beğeneceğini umuyoruz! 🌿\n\nBir sorun varsa bu e-postayı yanıtlamanız yeterli, hemen çözeriz.\n\nNot: Giriş yapmış müşteriler ürün sayfasından yorum yapabilir.${sign}`,
      },
      cancelled: {
        subject: `Loov siparişiniz ${orderNum} iptal edildi`,
        body: `Merhaba ${name},\n\n${orderNum} numaralı siparişiniz iptal edildi. Online ödeme yaptıysanız, iade 3–5 iş günü içinde işleme alınacak.\n\nBu beklenmedik bir durumsa, bu e-postayı yanıtlayın, hemen yardımcı olalım.${sign}`,
      },
    };
  },
};

/** Build a status-update email in the customer's language (falls back to English). */
export function buildStatusMessage(
  locale: Locale,
  status: OrderStatusKey,
  params: OrderMessageParams
): StatusCopy {
  const builder = statusBuilders[locale] ?? statusBuilders.en!;
  return builder(params)[status];
}

/* ════════════════════════════════════════════════════════════════
   Return emails — sent when a return request is created and on every
   admin status change (approved / received / refunded / rejected).
   ════════════════════════════════════════════════════════════════ */

export type ReturnStatusKey = "requested" | "approved" | "received" | "refunded" | "rejected";

export interface ReturnMessageParams {
  name: string;
  returnNum: string;
  orderNum: string;
  /** Refund total in GEL (already computed server-side). */
  amount: number;
  /** Rejection reason from the admin (rejected only). */
  note?: string;
}

type ReturnBuilder = (p: ReturnMessageParams) => Record<ReturnStatusKey, StatusCopy>;

const returnBuilders: Partial<Record<Locale, ReturnBuilder>> = {
  en: ({ name, returnNum, orderNum, amount, note }) => {
    const sign = `\n\nWith love,\nThe Loov Team`;
    return {
      requested: {
        subject: `We received your return request ${returnNum}`,
        body: `Hi ${name},\n\nWe've received your return request ${returnNum} for order ${orderNum}. Our team will review it within 24–48 hours and email you as soon as it's approved.\n\nRefund amount if approved: ${amount} ₾ (by bank transfer to your IBAN).${sign}`,
      },
      approved: {
        subject: `Your return ${returnNum} was approved ✅`,
        body: `Hi ${name},\n\nGood news — your return ${returnNum} (order ${orderNum}) has been approved!\n\nPlease pack the items in their original packaging. Our courier will collect the package from your delivery address — we'll contact you to arrange the pickup time.\n\nOnce the items reach us and pass inspection, ${amount} ₾ will be transferred to your IBAN.${sign}`,
      },
      received: {
        subject: `We received your return ${returnNum} 📦`,
        body: `Hi ${name},\n\nThe items from your return ${returnNum} (order ${orderNum}) have arrived and are being inspected. We'll process your refund of ${amount} ₾ shortly.${sign}`,
      },
      refunded: {
        subject: `Your refund for ${returnNum} is on its way 💸`,
        body: `Hi ${name},\n\nWe've transferred ${amount} ₾ to your IBAN for return ${returnNum} (order ${orderNum}). Depending on your bank, it may take 1–3 business days to appear.\n\nThank you for shopping with Loov — we hope to see you again!${sign}`,
      },
      rejected: {
        subject: `About your return request ${returnNum}`,
        body: `Hi ${name},\n\nUnfortunately we couldn't approve your return request ${returnNum} (order ${orderNum}).\n\nReason: ${note || "the request didn't meet our return conditions."}\n\nIf you believe this is a mistake, just reply to this email and we'll take another look.${sign}`,
      },
    };
  },
  ka: ({ name, returnNum, orderNum, amount, note }) => {
    const sign = `\n\nსიყვარულით,\nLoov-ს გუნდი`;
    return {
      requested: {
        subject: `თქვენი დაბრუნების მოთხოვნა ${returnNum} მიღებულია`,
        body: `გამარჯობა ${name},\n\nმივიღეთ თქვენი დაბრუნების მოთხოვნა ${returnNum} შეკვეთაზე ${orderNum}. ჩვენი გუნდი განიხილავს მას 24–48 საათში და დადასტურებისთანავე მოგწერთ.\n\nდასაბრუნებელი თანხა დამტკიცების შემთხვევაში: ${amount} ₾ (საბანკო გადარიცხვით თქვენს IBAN-ზე).${sign}`,
      },
      approved: {
        subject: `თქვენი დაბრუნება ${returnNum} დამტკიცდა ✅`,
        body: `გამარჯობა ${name},\n\nკარგი ამბავი — თქვენი დაბრუნება ${returnNum} (შეკვეთა ${orderNum}) დამტკიცდა!\n\nგთხოვთ, ჩაალაგოთ ნივთები ორიგინალ შეფუთვაში. ჩვენი კურიერი ამანათს თქვენი მიწოდების მისამართიდან წაიღებს — დაგიკავშირდებით დროის შესათანხმებლად.\n\nროგორც კი ნივთები მოგვივა და შემოწმებას გაივლის, ${amount} ₾ გადმოირიცხება თქვენს IBAN-ზე.${sign}`,
      },
      received: {
        subject: `თქვენი დაბრუნება ${returnNum} მოგვივიდა 📦`,
        body: `გამარჯობა ${name},\n\nთქვენი დაბრუნების ${returnNum} (შეკვეთა ${orderNum}) ნივთები მოვიდა და მოწმდება. თქვენი ${amount} ₾-ის დაბრუნებას მალე დავამუშავებთ.${sign}`,
      },
      refunded: {
        subject: `თქვენი თანხა ${returnNum}-ისთვის გზაშია 💸`,
        body: `გამარჯობა ${name},\n\nგადმოვრიცხეთ ${amount} ₾ თქვენს IBAN-ზე დაბრუნებისთვის ${returnNum} (შეკვეთა ${orderNum}). ბანკის მიხედვით, ასახვას შეიძლება 1–3 სამუშაო დღე დასჭირდეს.\n\nგმადლობთ, რომ Loov-ში იყიდეთ — გელოდებით კვლავ!${sign}`,
      },
      rejected: {
        subject: `თქვენი დაბრუნების მოთხოვნის ${returnNum} შესახებ`,
        body: `გამარჯობა ${name},\n\nსამწუხაროდ, ვერ დავამტკიცეთ თქვენი დაბრუნების მოთხოვნა ${returnNum} (შეკვეთა ${orderNum}).\n\nმიზეზი: ${note || "მოთხოვნა არ აკმაყოფილებდა დაბრუნების პირობებს."}\n\nთუ ფიქრობთ, რომ ეს შეცდომაა, უპასუხეთ ამ წერილს და კიდევ ერთხელ განვიხილავთ.${sign}`,
      },
    };
  },
  ru: ({ name, returnNum, orderNum, amount, note }) => {
    const sign = `\n\nС любовью,\nКоманда Loov`;
    return {
      requested: {
        subject: `Мы получили ваш запрос на возврат ${returnNum}`,
        body: `Здравствуйте, ${name},\n\nМы получили ваш запрос на возврат ${returnNum} по заказу ${orderNum}. Наша команда рассмотрит его в течение 24–48 часов и напишет вам сразу после одобрения.\n\nСумма возврата в случае одобрения: ${amount} ₾ (банковским переводом на ваш IBAN).${sign}`,
      },
      approved: {
        subject: `Ваш возврат ${returnNum} одобрен ✅`,
        body: `Здравствуйте, ${name},\n\nХорошие новости — ваш возврат ${returnNum} (заказ ${orderNum}) одобрен!\n\nПожалуйста, упакуйте товары в оригинальную упаковку. Наш курьер заберёт посылку с вашего адреса доставки — мы свяжемся с вами, чтобы согласовать время.\n\nКак только товары поступят к нам и пройдут проверку, ${amount} ₾ будут переведены на ваш IBAN.${sign}`,
      },
      received: {
        subject: `Мы получили ваш возврат ${returnNum} 📦`,
        body: `Здравствуйте, ${name},\n\nТовары из вашего возврата ${returnNum} (заказ ${orderNum}) поступили и проверяются. Мы скоро обработаем ваш возврат на сумму ${amount} ₾.${sign}`,
      },
      refunded: {
        subject: `Ваш возврат средств по ${returnNum} отправлен 💸`,
        body: `Здравствуйте, ${name},\n\nМы перевели ${amount} ₾ на ваш IBAN по возврату ${returnNum} (заказ ${orderNum}). В зависимости от банка зачисление может занять 1–3 рабочих дня.\n\nСпасибо за покупки в Loov — будем рады видеть вас снова!${sign}`,
      },
      rejected: {
        subject: `О вашем запросе на возврат ${returnNum}`,
        body: `Здравствуйте, ${name},\n\nК сожалению, мы не смогли одобрить ваш запрос на возврат ${returnNum} (заказ ${orderNum}).\n\nПричина: ${note || "запрос не соответствовал условиям возврата."}\n\nЕсли вы считаете это ошибкой, просто ответьте на это письмо — мы рассмотрим ещё раз.${sign}`,
      },
    };
  },
  tr: ({ name, returnNum, orderNum, amount, note }) => {
    const sign = `\n\nSevgiyle,\nLoov Ekibi`;
    return {
      requested: {
        subject: `İade talebiniz ${returnNum} alındı`,
        body: `Merhaba ${name},\n\n${orderNum} numaralı siparişiniz için ${returnNum} iade talebinizi aldık. Ekibimiz 24–48 saat içinde inceleyip onaylanır onaylanmaz size e-posta gönderecek.\n\nOnaylanırsa iade tutarı: ${amount} ₾ (IBAN'ınıza banka havalesiyle).${sign}`,
      },
      approved: {
        subject: `İadeniz ${returnNum} onaylandı ✅`,
        body: `Merhaba ${name},\n\nGüzel haber — ${returnNum} iadeniz (sipariş ${orderNum}) onaylandı!\n\nLütfen ürünleri orijinal ambalajında paketleyin. Kuryemiz paketi teslimat adresinizden alacak — alım saatini ayarlamak için sizinle iletişime geçeceğiz.\n\nÜrünler bize ulaşıp kontrolden geçtikten sonra ${amount} ₾ IBAN'ınıza aktarılacak.${sign}`,
      },
      received: {
        subject: `İadeniz ${returnNum} elimize ulaştı 📦`,
        body: `Merhaba ${name},\n\n${returnNum} iadenizin (sipariş ${orderNum}) ürünleri elimize ulaştı ve kontrol ediliyor. ${amount} ₾ iadenizi kısa süre içinde işleme alacağız.${sign}`,
      },
      refunded: {
        subject: `${returnNum} için iadeniz yolda 💸`,
        body: `Merhaba ${name},\n\n${returnNum} iadeniz (sipariş ${orderNum}) için ${amount} ₾ IBAN'ınıza aktardık. Bankanıza bağlı olarak hesabınıza yansıması 1–3 iş günü sürebilir.\n\nLoov'dan alışveriş yaptığınız için teşekkürler — sizi tekrar aramızda görmek isteriz!${sign}`,
      },
      rejected: {
        subject: `İade talebiniz ${returnNum} hakkında`,
        body: `Merhaba ${name},\n\nMaalesef ${returnNum} iade talebinizi (sipariş ${orderNum}) onaylayamadık.\n\nSebep: ${note || "talep iade koşullarımızı karşılamadı."}\n\nBunun bir hata olduğunu düşünüyorsanız, bu e-postayı yanıtlamanız yeterli, tekrar inceleyelim.${sign}`,
      },
    };
  },
};

/** Build a return-flow email in the customer's language (falls back to English). */
export function buildReturnMessage(
  locale: Locale,
  status: ReturnStatusKey,
  params: ReturnMessageParams
): StatusCopy {
  const builder = returnBuilders[locale] ?? returnBuilders.en!;
  return builder(params)[status];
}
