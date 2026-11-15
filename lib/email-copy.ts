// Every string in every email the shop sends, in English and Indonesian, for one place to review.
// Rupiah customers get Indonesian and everyone else English (see languageFor in lib/order-emails.ts).
// The owner's emails and the sign-in email are English only.
//
// Rules for this file: warm, premium and plain. No exclamation marks, no emoji, no urgency language,
// no em dashes. Subjects always carry the order reference and are never in capitals. Tests enforce
// the mechanical rules (tests/email.test.ts).

export type EmailLang = "en" | "id";

export const emailStageLabels = {
  en: {received: "Received", in_atelier: "In the atelier", finishing: "Finishing", shipped: "On its way"},
  id: {received: "Diterima", in_atelier: "Di atelier", finishing: "Tahap akhir", shipped: "Dalam pengiriman"}
} as const;

export type EmailStage = keyof (typeof emailStageLabels)["en"];

export const emailStrings = {
  en: {
    // Shared pieces of the frame
    labelOrderNote: (ref: string) => `Order note · ${ref}`,
    labelSignIn: "Natlovers · Sign in",
    labelWaitingList: "Natlovers · Waiting list",
    greeting: (name: string) => `Dear ${name},`,
    viewOrder: "View your order",
    orderRef: "Order reference",
    amount: "Amount",
    total: "Total",
    quantity: (count: number) => `Quantity ${count}`,
    price: "Price",
    yourNote: "Your note",
    baseColour: "Base colour",
    handleColour: "Handle colour",
    photoNote: "The photo shows the standard piece, your colours are listed beside it.",
    itemsHeading: "What you ordered",

    // Delivery promise
    deliveryHeading: "Delivery",
    estimatedReady: (range: string) => `Estimated ready: ${range}.`,
    shipsTogether: "Your order ships together, once the longest-made piece is ready.",
    readyDispatch: "This piece is ready stock. We pack and send it as soon as your order is confirmed.",
    readyMixed: (names: string) => `Ready stock (${names}) is packed and sent with the rest of your order.`,

    // Bank transfer block
    bankHeading: "Bank transfer",
    bank: "Bank",
    accountName: "Account name",
    accountNumber: "Account number",
    holdUntil: "Held until",

    // Order received
    placedSubject: (ref: string) => `Your Natlovers order ${ref}`,
    placedPreheaderIdr: (ref: string) => `We have your order ${ref}. Transfer details are inside.`,
    placedPreheaderUsd: (ref: string) => `We have your order ${ref}. An invoice in US dollars will follow.`,
    placedHeading: "Thank you, we have your order",
    placedIntroIdr: (expiry: string) =>
      `Your order is reserved until ${expiry}. Please transfer the exact amount below, quoting the reference, and we will begin once it arrives. If it does not, the order is released and nothing is taken from you.`,
    placedReference: "Please quote the order reference when you confirm your transfer.",
    placedNextIdr: "Once we have confirmed your payment you will receive another email, and your piece will be taken into the atelier.",
    placedIntroUsd: (amount: string) => `We have received your order for ${amount}.`,
    placedNextUsd:
      "We will email you an invoice in US dollars for exactly this amount, payable by PayPal or international bank transfer. We begin making your piece once payment is confirmed.",

    // Payment received
    paidSubject: (ref: string) => `Payment received for order ${ref}`,
    paidPreheader: (ref: string) => `Your payment for order ${ref} is confirmed.`,
    paidHeading: "We have received your payment",
    paidBody: (amount: string) => `Thank you. We have confirmed your payment of ${amount}, and your piece now joins the atelier queue.`,

    // Stages
    stageSubject: (ref: string, stage: string) => `Order ${ref}: ${stage}`,
    stagePreheader: (ref: string, stage: string) => `Order ${ref} is now: ${stage}.`,
    stageBody: {
      received: "We have your order and your payment, and it is waiting its turn in the atelier.",
      in_atelier: "Your piece is now in the atelier, and work on it has begun.",
      finishing: "Your piece is in its final stage, being finished by hand.",
      shipped: "Your piece is on its way to you."
    },

    // Shipped
    shippedSubject: (ref: string) => `Order ${ref} is on its way`,
    shippedPreheader: (ref: string) => `Order ${ref} has been handed to the courier.`,
    shippedHeading: "Your piece is on its way",
    shippedBody: "It has been handed to the courier. You can follow it with the details below.",
    courier: "Courier",
    trackingNumber: "Tracking number",

    // Cancelled and expired
    cancelledSubject: (ref: string) => `Order ${ref} has been cancelled`,
    cancelledPreheader: (ref: string) => `Order ${ref} has been cancelled. Nothing has been taken from you.`,
    cancelledHeading: "Your order has been cancelled",
    cancelledBody: "This order has been cancelled and its place in the atelier released. Nothing has been taken from you.",
    cancelledHelp: "If this was not what you expected, please write to us and we will be glad to help.",
    expiredSubject: (ref: string) => `Order ${ref} was released`,
    expiredPreheader: (ref: string) => `Order ${ref} was not paid in time and has been released.`,
    expiredHeading: "Your order has been released",
    expiredBody: "We did not receive payment before the hold ended, so the order has been released. Nothing has been taken from you.",
    expiredHelp: "You are welcome to place it again whenever you like.",
    browse: "Browse the catalogue",

    // Sign-in link (English only)
    signInSubject: "Sign in to Natlovers",
    signInPreheader: "Your sign-in link for Natlovers.",
    signInHeading: "Sign in to Natlovers",
    signInBody: "Use the button below to sign in to your account. This link expires in 24 hours and can only be used once.",
    signInButton: "Sign in",
    signInIgnore: "If you did not request this email, you can safely ignore it. No account changes will be made.",

    // Waiting list
    waitingSubject: "You are on the Natlovers waiting list",
    waitingPreheader: "We will write once the atelier has room again.",
    waitingHeading: "You are on the waiting list",
    waitingBody: "Thank you. We will write to you once the atelier has room again. We will not send anything else.",
    reopenedSubject: "The Natlovers atelier is open again",
    reopenedPreheader: "There is room for new orders again.",
    reopenedHeading: "The atelier is open again",
    reopenedBody: (month: string) => `We now have room for new orders in ${month}. You can browse the catalogue whenever you like.`,
    unsubscribe: "Unsubscribe from the waiting list",

    // Owner emails (English only), workshop summaries
    ownerPlacedSubject: (ref: string) => `New order ${ref}`,
    ownerPaidSubject: (ref: string) => `Order ${ref} marked as paid`,
    ownerPlacedPreheader: (ref: string, count: number) => `New order ${ref}, ${count} ${count === 1 ? "item" : "items"}.`,
    ownerPaidPreheader: (ref: string) => `Order ${ref} has been marked as paid.`,
    ownerLabel: (ref: string) => `Workshop summary · ${ref}`,
    ownerPlacedHeading: "A new order has come in",
    ownerPaidHeading: "An order has been paid",
    ownerCustomer: "Customer",
    ownerTotal: "Total",
    ownerItems: "Items",
    ownerStatus: "Payment",
    ownerStatusAwaiting: "Awaiting transfer",
    ownerStatusPaid: "Marked as paid",
    ownerOpenAdmin: "Open in the admin",
    ownerNoEmail: "No email",

    // Footer signature block
    tagline: "Art, craft, and heart from Yogyakarta.",
    since: "Handmade natural fibre goods from Yogyakarta since 1998",
    contactAddress: "Address",
    contactWhatsApp: "WhatsApp",
    contactEmail: "Email",
    contactInstagram: "Instagram",
    automated: "This is an automated message about your order. If you need us, please write using the details above.",
    addContact: (address: string) => `Add ${address} to your contacts so our updates reach your inbox.`
  },
  id: {
    labelOrderNote: (ref: string) => `Catatan pesanan · ${ref}`,
    labelSignIn: "Natlovers · Masuk",
    labelWaitingList: "Natlovers · Daftar tunggu",
    greeting: (name: string) => `Yth. ${name},`,
    viewOrder: "Lihat pesanan Anda",
    orderRef: "Referensi pesanan",
    amount: "Jumlah",
    total: "Total",
    quantity: (count: number) => `Jumlah ${count}`,
    price: "Harga",
    yourNote: "Catatan Anda",
    baseColour: "Warna dasar",
    handleColour: "Warna tali",
    photoNote: "Foto menunjukkan karya standar, warna pilihan Anda tercantum di sampingnya.",
    itemsHeading: "Pesanan Anda",

    deliveryHeading: "Pengiriman",
    estimatedReady: (range: string) => `Perkiraan selesai: ${range}.`,
    shipsTogether: "Pesanan Anda dikirim bersamaan, setelah karya yang paling lama dibuat selesai.",
    readyDispatch: "Karya ini adalah stok siap kirim. Kami mengemas dan mengirimkannya segera setelah pesanan Anda dikonfirmasi.",
    readyMixed: (names: string) => `Stok siap kirim (${names}) dikemas dan dikirim bersama sisa pesanan Anda.`,

    bankHeading: "Transfer bank",
    bank: "Bank",
    accountName: "Nama rekening",
    accountNumber: "Nomor rekening",
    holdUntil: "Ditahan hingga",

    placedSubject: (ref: string) => `Pesanan Natlovers Anda ${ref}`,
    placedPreheaderIdr: (ref: string) => `Pesanan ${ref} sudah kami terima. Rincian transfer ada di dalam.`,
    placedPreheaderUsd: (ref: string) => `Pesanan ${ref} sudah kami terima. Invoice dalam dolar AS akan menyusul.`,
    placedHeading: "Terima kasih, pesanan Anda kami terima",
    placedIntroIdr: (expiry: string) =>
      `Pesanan Anda kami simpan hingga ${expiry}. Mohon transfer jumlah tepat di bawah ini dengan mencantumkan referensi, dan kami mulai membuat karya Anda setelah pembayaran diterima. Jika belum diterima, pesanan dilepas dan tidak ada yang diambil dari Anda.`,
    placedReference: "Mohon cantumkan referensi pesanan saat mengonfirmasi transfer Anda.",
    placedNextIdr: "Setelah pembayaran kami konfirmasi, Anda akan menerima email lagi, dan karya Anda akan kami ambil ke dalam atelier.",
    placedIntroUsd: (amount: string) => `Kami telah menerima pesanan Anda sebesar ${amount}.`,
    placedNextUsd:
      "Kami akan mengirim invoice dalam dolar AS untuk jumlah ini, yang dapat dibayar melalui PayPal atau transfer bank internasional. Kami mulai membuat karya Anda setelah pembayaran dikonfirmasi.",

    paidSubject: (ref: string) => `Pembayaran untuk pesanan ${ref} diterima`,
    paidPreheader: (ref: string) => `Pembayaran pesanan ${ref} sudah kami konfirmasi.`,
    paidHeading: "Pembayaran Anda sudah kami terima",
    paidBody: (amount: string) => `Terima kasih. Pembayaran Anda sebesar ${amount} telah kami konfirmasi, dan karya Anda kini masuk ke antrean atelier.`,

    stageSubject: (ref: string, stage: string) => `Pesanan ${ref}: ${stage}`,
    stagePreheader: (ref: string, stage: string) => `Pesanan ${ref} kini: ${stage}.`,
    stageBody: {
      received: "Pesanan dan pembayaran Anda sudah kami terima, dan sedang menunggu giliran di atelier.",
      in_atelier: "Karya Anda kini berada di atelier, dan pengerjaannya sudah dimulai.",
      finishing: "Karya Anda berada di tahap akhir, diselesaikan dengan tangan.",
      shipped: "Karya Anda sedang dalam perjalanan kepada Anda."
    },

    shippedSubject: (ref: string) => `Pesanan ${ref} dalam pengiriman`,
    shippedPreheader: (ref: string) => `Pesanan ${ref} sudah diserahkan kepada kurir.`,
    shippedHeading: "Karya Anda dalam perjalanan",
    shippedBody: "Pesanan telah diserahkan kepada kurir. Anda dapat melacaknya dengan rincian di bawah ini.",
    courier: "Kurir",
    trackingNumber: "Nomor resi",

    cancelledSubject: (ref: string) => `Pesanan ${ref} dibatalkan`,
    cancelledPreheader: (ref: string) => `Pesanan ${ref} dibatalkan. Tidak ada yang diambil dari Anda.`,
    cancelledHeading: "Pesanan Anda dibatalkan",
    cancelledBody: "Pesanan ini telah dibatalkan dan tempatnya di atelier dilepas. Tidak ada yang diambil dari Anda.",
    cancelledHelp: "Jika ini tidak sesuai dengan harapan Anda, silakan hubungi kami dan kami dengan senang hati membantu.",
    expiredSubject: (ref: string) => `Pesanan ${ref} dilepas`,
    expiredPreheader: (ref: string) => `Pesanan ${ref} tidak dibayar tepat waktu dan telah dilepas.`,
    expiredHeading: "Pesanan Anda dilepas",
    expiredBody: "Kami belum menerima pembayaran sebelum masa tahan berakhir, sehingga pesanan dilepas. Tidak ada yang diambil dari Anda.",
    expiredHelp: "Anda dipersilakan memesannya kembali kapan pun Anda mau.",
    browse: "Lihat katalog",

    signInSubject: "Masuk ke Natlovers",
    signInPreheader: "Tautan masuk Anda untuk Natlovers.",
    signInHeading: "Masuk ke Natlovers",
    signInBody: "Gunakan tombol di bawah untuk masuk ke akun Anda. Tautan ini berlaku 24 jam dan hanya dapat dipakai sekali.",
    signInButton: "Masuk",
    signInIgnore: "Jika Anda tidak meminta email ini, abaikan saja. Tidak ada perubahan pada akun Anda.",

    waitingSubject: "Anda masuk daftar tunggu Natlovers",
    waitingPreheader: "Kami akan menulis saat atelier kembali memiliki ruang.",
    waitingHeading: "Anda masuk daftar tunggu",
    waitingBody: "Terima kasih. Kami akan menulis kepada Anda saat atelier kembali memiliki ruang. Tidak ada email lain yang kami kirim.",
    reopenedSubject: "Atelier Natlovers kembali dibuka",
    reopenedPreheader: "Kini ada ruang untuk pesanan baru.",
    reopenedHeading: "Atelier kembali dibuka",
    reopenedBody: (month: string) => `Kini kami memiliki ruang untuk pesanan baru pada ${month}. Silakan melihat katalog kapan pun Anda mau.`,
    unsubscribe: "Berhenti dari daftar tunggu",

    // Owner emails are English only; these are kept so the two languages share one shape.
    ownerPlacedSubject: (ref: string) => `Pesanan baru ${ref}`,
    ownerPaidSubject: (ref: string) => `Pesanan ${ref} ditandai lunas`,
    ownerPlacedPreheader: (ref: string, count: number) => `Pesanan baru ${ref}, ${count} barang.`,
    ownerPaidPreheader: (ref: string) => `Pesanan ${ref} ditandai lunas.`,
    ownerLabel: (ref: string) => `Ringkasan bengkel · ${ref}`,
    ownerPlacedHeading: "Pesanan baru masuk",
    ownerPaidHeading: "Pesanan telah dibayar",
    ownerCustomer: "Pelanggan",
    ownerTotal: "Total",
    ownerItems: "Barang",
    ownerStatus: "Pembayaran",
    ownerStatusAwaiting: "Menunggu transfer",
    ownerStatusPaid: "Ditandai lunas",
    ownerOpenAdmin: "Buka di admin",
    ownerNoEmail: "Tanpa email",

    tagline: "Seni, kriya, dan hati dari Yogyakarta.",
    since: "Barang serat alami buatan tangan dari Yogyakarta sejak 1998",
    contactAddress: "Alamat",
    contactWhatsApp: "WhatsApp",
    contactEmail: "Email",
    contactInstagram: "Instagram",
    automated: "Ini adalah pesan otomatis tentang pesanan Anda. Jika membutuhkan kami, silakan menulis lewat kontak di atas.",
    addContact: (address: string) => `Tambahkan ${address} ke kontak Anda agar kabar dari kami masuk ke kotak masuk Anda.`
  }
} as const;
