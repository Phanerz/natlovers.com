// Every customer-facing string added for the atelier work lives here, in English and Indonesian, so
// it can be read and approved in one place. Customers who pay in rupiah see Indonesian; customers
// who pay in US dollars see English. Voice: quiet, specific, British English, no exclamation marks.
import type {LimitViolation} from "@/lib/atelier-limits";
import {monthName} from "@/lib/atelier-limits";
import type {CurrencyCode} from "@/lib/site";

export type Lang = "en" | "id";

export function langForCurrency(currency: CurrencyCode): Lang {
  return currency === "IDR" ? "id" : "en";
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const NUMBER_WORDS_ID = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];

function numberWord(value: number, lang: Lang) {
  const words = lang === "id" ? NUMBER_WORDS_ID : NUMBER_WORDS;
  return words[value] ?? String(value);
}

export const copy = {
  en: {
    madeInSmallNumbers: "Made in small numbers, each piece by one pair of hands.",
    readyIn: (min: number, max: number) =>
      min === max
        ? `Made for you by hand. Ready in approximately ${min} ${min === 1 ? "week" : "weeks"}.`
        : `Made for you by hand. Ready in approximately ${min} to ${max} weeks.`,
    monthFull: (month: string) => `Our atelier has reached its limit for this month. Next available in ${month}.`,
    joinWaitingList: "Join the waiting list",
    waitingListIntro: "Leave your email and we will write to you once the atelier opens again. Nothing else will be sent.",
    waitingListEmailLabel: "Email address",
    waitingListSubmit: "Join the waiting list",
    waitingListSending: "Sending",
    waitingListDone: "Thank you. We have sent a confirmation to your email.",
    waitingListInvalid: "Please enter a valid email address.",
    waitingListTooMany: "Too many attempts. Please try again in a little while.",
    waitingListError: "We could not add you just now. Please try again shortly.",
    productLimit: (max: number) =>
      `Our atelier accepts up to ${numberWord(max, "en")} of these per order, so each one is made with care.`,
    groupLimit: (max: number) =>
      `Our atelier accepts up to ${numberWord(max, "en")} per order, so each one is made with care.`,
    largerOrders: "For larger orders, please get in touch.",
    getInTouch: "Get in touch",
    monthFullAtOrder: (month: string) =>
      `Our atelier has reached its limit for this month, so we could not place this order. Next available in ${month}.`,
    bagUpdateFailed: "We could not update your bag. Please try again.",
    bankUnavailable: "Bank transfer is not available just now, so your order has not been placed. Please try again later, or get in touch with us.",
    orderFailed: "We could not place your order. Please try again."
  },
  id: {
    madeInSmallNumbers: "Dibuat dalam jumlah kecil, setiap karya oleh sepasang tangan.",
    readyIn: (min: number, max: number) =>
      min === max
        ? `Dibuat untuk Anda dengan tangan. Siap dalam sekitar ${min} minggu.`
        : `Dibuat untuk Anda dengan tangan. Siap dalam sekitar ${min} sampai ${max} minggu.`,
    monthFull: (month: string) => `Atelier kami telah mencapai batas untuk bulan ini. Tersedia kembali pada ${month}.`,
    joinWaitingList: "Gabung daftar tunggu",
    waitingListIntro: "Tinggalkan email Anda dan kami akan menulis kepada Anda saat atelier kembali dibuka. Tidak ada email lain yang dikirim.",
    waitingListEmailLabel: "Alamat email",
    waitingListSubmit: "Gabung daftar tunggu",
    waitingListSending: "Mengirim",
    waitingListDone: "Terima kasih. Kami telah mengirim konfirmasi ke email Anda.",
    waitingListInvalid: "Mohon masukkan alamat email yang valid.",
    waitingListTooMany: "Terlalu banyak percobaan. Silakan coba lagi sebentar lagi.",
    waitingListError: "Kami belum dapat menambahkan Anda. Silakan coba lagi sebentar lagi.",
    productLimit: (max: number) =>
      `Atelier kami menerima hingga ${numberWord(max, "id")} buah untuk setiap pesanan, agar setiap karya dibuat dengan cermat.`,
    groupLimit: (max: number) =>
      `Atelier kami menerima hingga ${numberWord(max, "id")} buah untuk setiap pesanan, agar setiap karya dibuat dengan cermat.`,
    largerOrders: "Untuk pesanan yang lebih besar, silakan hubungi kami.",
    getInTouch: "Hubungi kami",
    monthFullAtOrder: (month: string) =>
      `Atelier kami telah mencapai batas untuk bulan ini, sehingga pesanan ini belum dapat dibuat. Tersedia kembali pada ${month}.`,
    bagUpdateFailed: "Kami belum dapat memperbarui tas Anda. Silakan coba lagi.",
    bankUnavailable: "Transfer bank sedang tidak tersedia, sehingga pesanan Anda belum dibuat. Silakan coba lagi nanti, atau hubungi kami.",
    orderFailed: "Kami belum dapat membuat pesanan Anda. Silakan coba lagi."
  }
} as const;

export type LimitNotice = {text: string; kind: "limit" | "month_full"; showContactLink: boolean};

// The customer-facing sentence for a limit that was hit.
export function limitNotice(violation: LimitViolation, lang: Lang, nextMonthNumber: number, context: "bag" | "order" = "bag"): LimitNotice {
  const strings = copy[lang];
  if (violation.code === "month_full") {
    const month = monthName(nextMonthNumber, lang);
    return {
      kind: "month_full",
      text: context === "order" ? strings.monthFullAtOrder(month) : strings.monthFull(month),
      showContactLink: false
    };
  }
  const base = violation.code === "product_max" ? strings.productLimit(violation.max) : strings.groupLimit(violation.max);
  return {kind: "limit", text: `${base} ${strings.largerOrders}`, showContactLink: true};
}

// ---------------------------------------------------------------------------
// Emails and the customer order page. Built by lib/order-emails.ts and the order views.
// ---------------------------------------------------------------------------

export const stageLabels = {
  en: {received: "Received", in_atelier: "In the atelier", finishing: "Finishing", shipped: "On its way"},
  id: {received: "Diterima", in_atelier: "Di atelier", finishing: "Tahap akhir", shipped: "Dalam pengiriman"}
} as const;

export const emailCopy = {
  en: {
    viewOrder: "View your order",
    orderRef: "Order reference",
    amount: "Amount",
    bank: "Bank",
    accountName: "Account name",
    accountNumber: "Account number",
    holdUntil: "Held until",
    placedSubjectIdr: (ref: string) => `Your order ${ref}`,
    placedSubjectUsd: (ref: string) => `Your order ${ref}`,
    placedHeading: "Thank you, we have your order",
    placedIntroIdr: (expiry: string) =>
      `Please transfer the amount below by ${expiry}. After that time the order is released, and nothing has been taken from you.`,
    placedReference: "Please quote the order reference when you confirm your transfer.",
    placedNextIdr: "Once we have confirmed your payment you will receive another email, and your piece will be taken into the atelier.",
    placedIntroUsd: (amount: string) => `We have received your order for ${amount}. There is nothing more you need to do for now.`,
    placedNextUsd:
      "What happens next: we will email you an invoice in US dollars for exactly this amount, payable by PayPal or international bank transfer. Your order is held while you wait for it. Once payment is confirmed, we begin making your piece.",
    paidSubject: (ref: string) => `Payment received for order ${ref}`,
    paidHeading: "We have received your payment",
    paidBody: (amount: string) => `Thank you. We have confirmed your payment of ${amount}, and your piece now joins the atelier queue.`,
    stageSubject: (ref: string, stage: string) => `Order ${ref}: ${stage}`,
    stageBody: {
      received: "We have your order and your payment, and it is waiting its turn in the atelier.",
      in_atelier: "Your piece is now in the atelier, and work on it has begun.",
      finishing: "Your piece is in its final stage, being finished by hand.",
      shipped: "Your piece is on its way to you."
    },
    shippedSubject: (ref: string) => `Order ${ref} is on its way`,
    shippedHeading: "Your piece is on its way",
    shippedBody: "It has been handed to the courier. You can follow it with the details below.",
    courier: "Courier",
    trackingNumber: "Tracking number",
    estimatedReady: (range: string) => `Estimated ready: ${range}.`,
    ownerPlacedSubject: (ref: string) => `New order ${ref}`,
    ownerPaidSubject: (ref: string) => `Order ${ref} marked as paid`,
    ownerCustomer: "Customer",
    ownerTotal: "Total",
    ownerItems: "Items",
    waitingSubject: "You are on the Natlovers waiting list",
    waitingHeading: "You are on the waiting list",
    waitingBody: "Thank you. We will write to you once the atelier has room again. We will not send anything else.",
    reopenedSubject: "The Natlovers atelier is open again",
    reopenedHeading: "The atelier is open again",
    reopenedBody: (month: string) => `We now have room for new orders in ${month}. You can browse the catalogue whenever you like.`,
    browse: "Browse the catalogue",
    unsubscribe: "Unsubscribe from the waiting list",
    unsubscribedPage: "You have been removed from the waiting list. Nothing more will be sent.",
    footer: "Handmade natural fibre goods from Yogyakarta, Indonesia."
  },
  id: {
    viewOrder: "Lihat pesanan Anda",
    orderRef: "Referensi pesanan",
    amount: "Jumlah",
    bank: "Bank",
    accountName: "Nama rekening",
    accountNumber: "Nomor rekening",
    holdUntil: "Ditahan hingga",
    placedSubjectIdr: (ref: string) => `Pesanan Anda ${ref}`,
    placedSubjectUsd: (ref: string) => `Pesanan Anda ${ref}`,
    placedHeading: "Terima kasih, pesanan Anda kami terima",
    placedIntroIdr: (expiry: string) =>
      `Mohon transfer jumlah di bawah ini sebelum ${expiry}. Setelah waktu tersebut pesanan dilepas, dan tidak ada yang diambil dari Anda.`,
    placedReference: "Mohon cantumkan referensi pesanan saat mengonfirmasi transfer Anda.",
    placedNextIdr: "Setelah pembayaran kami konfirmasi, Anda akan menerima email lagi, dan karya Anda akan kami ambil ke dalam atelier.",
    placedIntroUsd: (amount: string) => `Kami telah menerima pesanan Anda sebesar ${amount}.`,
    placedNextUsd:
      "Selanjutnya: kami akan mengirim invoice dalam dolar AS untuk jumlah ini, yang dapat dibayar melalui PayPal atau transfer bank internasional. Pesanan Anda ditahan selama Anda menunggunya.",
    paidSubject: (ref: string) => `Pembayaran untuk pesanan ${ref} diterima`,
    paidHeading: "Pembayaran Anda sudah kami terima",
    paidBody: (amount: string) => `Terima kasih. Pembayaran Anda sebesar ${amount} telah kami konfirmasi, dan karya Anda kini masuk ke antrean atelier.`,
    stageSubject: (ref: string, stage: string) => `Pesanan ${ref}: ${stage}`,
    stageBody: {
      received: "Pesanan dan pembayaran Anda sudah kami terima, dan sedang menunggu giliran di atelier.",
      in_atelier: "Karya Anda kini berada di atelier, dan pengerjaannya sudah dimulai.",
      finishing: "Karya Anda berada di tahap akhir, diselesaikan dengan tangan.",
      shipped: "Karya Anda sedang dalam perjalanan kepada Anda."
    },
    shippedSubject: (ref: string) => `Pesanan ${ref} dalam pengiriman`,
    shippedHeading: "Karya Anda dalam perjalanan",
    shippedBody: "Pesanan telah diserahkan kepada kurir. Anda dapat melacaknya dengan rincian di bawah ini.",
    courier: "Kurir",
    trackingNumber: "Nomor resi",
    estimatedReady: (range: string) => `Perkiraan selesai: ${range}.`,
    ownerPlacedSubject: (ref: string) => `Pesanan baru ${ref}`,
    ownerPaidSubject: (ref: string) => `Pesanan ${ref} ditandai lunas`,
    ownerCustomer: "Pelanggan",
    ownerTotal: "Total",
    ownerItems: "Barang",
    waitingSubject: "Anda masuk daftar tunggu Natlovers",
    waitingHeading: "Anda masuk daftar tunggu",
    waitingBody: "Terima kasih. Kami akan menulis kepada Anda saat atelier kembali memiliki ruang. Tidak ada email lain yang kami kirim.",
    reopenedSubject: "Atelier Natlovers kembali dibuka",
    reopenedHeading: "Atelier kembali dibuka",
    reopenedBody: (month: string) => `Kini kami memiliki ruang untuk pesanan baru pada ${month}. Silakan melihat katalog kapan pun Anda mau.`,
    browse: "Lihat katalog",
    unsubscribe: "Berhenti dari daftar tunggu",
    unsubscribedPage: "Anda telah dihapus dari daftar tunggu. Tidak ada email lagi yang akan dikirim.",
    footer: "Barang serat alami buatan tangan dari Yogyakarta, Indonesia."
  }
} as const;

// The customer order page and the confirmation view.
export const orderCopy = {
  en: {
    progressLabel: "Order progress",
    estimatedReady: "Estimated ready",
    courier: "Courier",
    trackingNumber: "Tracking number",
    expiredNote: "This order was not paid in time and has been released. You are welcome to place it again.",
    cancelledNote: "This order has been cancelled.",
    awaiting: "Awaiting payment",
    heldUntil: (when: string) => `Held until ${when}.`,
    usdAwaiting: "We will email you an invoice in US dollars for this order."
  },
  id: {
    progressLabel: "Perkembangan pesanan",
    estimatedReady: "Perkiraan selesai",
    courier: "Kurir",
    trackingNumber: "Nomor resi",
    expiredNote: "Pesanan ini tidak dibayar tepat waktu dan telah dilepas. Anda dipersilakan memesannya kembali.",
    cancelledNote: "Pesanan ini telah dibatalkan.",
    awaiting: "Menunggu pembayaran",
    heldUntil: (when: string) => `Ditahan hingga ${when}.`,
    usdAwaiting: "Kami akan mengirim invoice dalam dolar AS untuk pesanan ini melalui email."
  }
} as const;
