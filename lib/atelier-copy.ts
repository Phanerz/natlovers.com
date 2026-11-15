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
    readyToShip: "Ready to ship",
    soldOut: "Sold out",
    stockLimit: (available: number) =>
      available <= 0
        ? "This piece is sold out for now."
        : `Only ${numberWord(available, "en")} of these ${available === 1 ? "is" : "are"} ready to ship.`,
    shipsTogether: "Your bag ships together, once the longest-made piece is ready.",
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
    orderFailed: "We could not place your order. Please try again.",
    tooManyOpenOrders: "You already have two orders waiting for payment. Please complete or wait for one of them to be released before placing another.",
    tooManyAttempts: "You have placed several orders in a short time. Please wait a little while before trying again.",
    invalidQuantity: "Please choose a whole number of pieces, at least one."
  },
  id: {
    madeInSmallNumbers: "Dibuat dalam jumlah kecil, setiap karya oleh sepasang tangan.",
    readyToShip: "Siap dikirim",
    soldOut: "Habis terjual",
    stockLimit: (available: number) =>
      available <= 0
        ? "Karya ini sedang habis terjual."
        : `Hanya ${numberWord(available, "id")} buah yang siap dikirim.`,
    shipsTogether: "Tas Anda dikirim bersamaan, setelah karya yang paling lama dibuat selesai.",
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
    orderFailed: "Kami belum dapat membuat pesanan Anda. Silakan coba lagi.",
    tooManyOpenOrders: "Anda sudah memiliki dua pesanan yang menunggu pembayaran. Mohon selesaikan atau tunggu salah satunya dilepas sebelum membuat pesanan lain.",
    tooManyAttempts: "Anda membuat beberapa pesanan dalam waktu singkat. Mohon tunggu sebentar sebelum mencoba lagi.",
    invalidQuantity: "Mohon pilih jumlah bulat, minimal satu."
  }
} as const;

export type LimitNotice = {text: string; kind: "limit" | "month_full" | "stock"; showContactLink: boolean; showWaitingList: boolean};

// The customer-facing sentence for a limit that was hit.
export function limitNotice(violation: LimitViolation, lang: Lang, nextMonthNumber: number, context: "bag" | "order" = "bag"): LimitNotice {
  const strings = copy[lang];
  if (violation.code === "month_full") {
    const month = monthName(nextMonthNumber, lang);
    return {
      kind: "month_full",
      text: context === "order" ? strings.monthFullAtOrder(month) : strings.monthFull(month),
      showContactLink: false,
      showWaitingList: true
    };
  }
  if (violation.code === "stock") {
    // A sold-out ready piece offers the same waiting list. Some left: just say how many.
    return {kind: "stock", text: strings.stockLimit(violation.available), showContactLink: false, showWaitingList: violation.available <= 0};
  }
  const base = violation.code === "product_max" ? strings.productLimit(violation.max) : strings.groupLimit(violation.max);
  return {kind: "limit", text: `${base} ${strings.largerOrders}`, showContactLink: true, showWaitingList: false};
}

// ---------------------------------------------------------------------------
// The customer order page and the unsubscribe page. Emails have their own copy in lib/email-copy.ts.
// ---------------------------------------------------------------------------

export const stageLabels = {
  en: {received: "Received", in_atelier: "In the atelier", finishing: "Finishing", shipped: "On its way"},
  id: {received: "Diterima", in_atelier: "Di atelier", finishing: "Tahap akhir", shipped: "Dalam pengiriman"}
} as const;

// Only the unsubscribe page still reads this. Every email string lives in lib/email-copy.ts.
export const emailCopy = {
  en: {unsubscribedPage: "You have been removed from the waiting list. Nothing more will be sent."},
  id: {unsubscribedPage: "Anda telah dihapus dari daftar tunggu. Tidak ada email lagi yang akan dikirim."}
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

// The bag and checkout sidebar.
export const bagCopy = {
  en: {
    title: "Your bag",
    close: "Close bag",
    stepsLabel: "Checkout steps",
    steps: ["Bag", "Delivery", "Confirmation"],
    empty: "Your bag is empty.",
    emptyHint: "Discover something handmade for you.",
    explore: "Explore the catalogue",
    continueShopping: "Continue shopping",
    remove: (name: string) => `Remove ${name} from your bag`,
    decrease: (name: string) => `Decrease quantity of ${name}`,
    increase: (name: string) => `Increase quantity of ${name}`,
    quantity: (name: string) => `Quantity for ${name}`,
    lineTotal: "Total",
    subtotal: "Subtotal",
    total: "Total",
    toDelivery: "Continue to delivery",
    backToBag: "Back to bag",
    placeOrder: "Place order",
    placing: "Placing your order",
    deliveryTitle: "Where should it go?",
    orderSummary: "Order summary",
    qty: "Qty",
    fixedPrice: "Prices in US dollars are fixed by Natlovers. You pay exactly the amount shown.",
    labels: {
      recipientName: "Recipient name",
      phone: "Phone, for WhatsApp",
      street: "Street address",
      city: "City",
      province: "Province or state (optional)",
      postalCode: "Postal code",
      country: "Country"
    },
    errors: {
      recipientName: "Please enter the name of the person receiving the order.",
      phone: "Please enter a phone number we can reach you on.",
      street: "Please enter the street address.",
      city: "Please enter the city.",
      postalCode: "Please enter the postal code.",
      country: "Please enter the country."
    },
    termsLead: "By placing your order you agree to our",
    terms: "Terms of Service",
    returns: "Returns and Shipping",
    privacy: "Privacy Policy",
    and: "and",
    doneTitle: "Your order is reserved",
    doneRef: "Order reference",
    doneAmount: "Amount to transfer",
    doneAmountUsd: "Order total",
    doneBank: "Bank",
    doneAccountName: "Account name",
    doneAccountNumber: "Account number",
    copyNumber: "Copy account number",
    copyAmount: "Copy amount",
    copied: "Copied",
    transferBefore: (when: string) =>
      `One step remains: payment. Your order is held for you until ${when}. Please transfer the exact amount below before then, and we will begin making your piece once it arrives. If it does not arrive in time, the order is simply released and nothing is taken from you.`,
    nextTitle: "What happens next",
    nextIdr: [
      "First, you transfer the exact amount shown, quoting your order reference.",
      "We confirm your payment and email you.",
      "Only then is your piece taken into the atelier, and you can follow its progress on your order page."
    ],
    nextUsd: [
      "We email you an invoice in US dollars for the exact amount above, payable by PayPal or international bank transfer.",
      "Your order is held for you while you settle the invoice.",
      "We begin making your piece only once payment is confirmed."
    ],
    viewOrder: "View your order",
    limitsHeading: "A note on this order"
  },
  id: {
    title: "Tas Anda",
    close: "Tutup tas",
    stepsLabel: "Langkah pembayaran",
    steps: ["Tas", "Pengiriman", "Konfirmasi"],
    empty: "Tas Anda kosong.",
    emptyHint: "Temukan sesuatu yang dibuat dengan tangan untuk Anda.",
    explore: "Jelajahi katalog",
    continueShopping: "Lanjut belanja",
    remove: (name: string) => `Hapus ${name} dari tas Anda`,
    decrease: (name: string) => `Kurangi jumlah ${name}`,
    increase: (name: string) => `Tambah jumlah ${name}`,
    quantity: (name: string) => `Jumlah ${name}`,
    lineTotal: "Total",
    subtotal: "Subtotal",
    total: "Total",
    toDelivery: "Lanjut ke pengiriman",
    backToBag: "Kembali ke tas",
    placeOrder: "Buat pesanan",
    placing: "Membuat pesanan Anda",
    deliveryTitle: "Dikirim ke mana?",
    orderSummary: "Ringkasan pesanan",
    qty: "Jml",
    fixedPrice: "Harga dalam rupiah ditetapkan oleh Natlovers. Anda membayar sesuai jumlah yang tertera.",
    labels: {
      recipientName: "Nama penerima",
      phone: "Telepon, untuk WhatsApp",
      street: "Alamat lengkap",
      city: "Kota",
      province: "Provinsi (opsional)",
      postalCode: "Kode pos",
      country: "Negara"
    },
    errors: {
      recipientName: "Mohon isi nama penerima pesanan.",
      phone: "Mohon isi nomor telepon yang dapat kami hubungi.",
      street: "Mohon isi alamat lengkap.",
      city: "Mohon isi kota.",
      postalCode: "Mohon isi kode pos.",
      country: "Mohon isi negara."
    },
    termsLead: "Dengan membuat pesanan, Anda menyetujui",
    terms: "Ketentuan Layanan",
    returns: "Pengembalian dan Pengiriman",
    privacy: "Kebijakan Privasi",
    and: "dan",
    doneTitle: "Pesanan Anda sudah kami simpan",
    doneRef: "Referensi pesanan",
    doneAmount: "Jumlah transfer",
    doneAmountUsd: "Total pesanan",
    doneBank: "Bank",
    doneAccountName: "Nama rekening",
    doneAccountNumber: "Nomor rekening",
    copyNumber: "Salin nomor rekening",
    copyAmount: "Salin jumlah",
    copied: "Tersalin",
    transferBefore: (when: string) =>
      `Tinggal satu langkah: pembayaran. Pesanan Anda kami simpan hingga ${when}. Mohon transfer jumlah tepat di bawah ini sebelum waktu tersebut, dan kami mulai membuat karya Anda setelah pembayaran kami terima. Jika belum diterima tepat waktu, pesanan dilepas dan tidak ada yang diambil dari Anda.`,
    nextTitle: "Langkah selanjutnya",
    nextIdr: [
      "Pertama, Anda mentransfer jumlah yang tertera, dengan mencantumkan referensi pesanan.",
      "Kami mengonfirmasi pembayaran Anda dan mengirim email.",
      "Setelah itu karya Anda diambil ke dalam atelier, dan Anda dapat mengikuti perkembangannya di halaman pesanan."
    ],
    nextUsd: [
      "Kami mengirim invoice dalam dolar AS untuk jumlah di atas, yang dapat dibayar melalui PayPal atau transfer bank internasional.",
      "Pesanan Anda kami simpan selama Anda menyelesaikan invoice.",
      "Kami mulai membuat karya Anda hanya setelah pembayaran dikonfirmasi."
    ],
    viewOrder: "Lihat pesanan Anda",
    limitsHeading: "Catatan untuk pesanan ini"
  }
} as const;
