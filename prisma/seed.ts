import {PrismaClient, CurrencyCode, Locale, PaymentMethod, ProductStatus, UserRole} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bagCategory = await prisma.category.upsert({
    where: {slug: "handbags"},
    update: {},
    create: {
      slug: "handbags",
      nameEn: "Handbags",
      nameId: "Tas",
      description: "Handwoven Natlovers signature bags."
    }
  });

  const homeCategory = await prisma.category.upsert({
    where: {slug: "home-accessories"},
    update: {},
    create: {
      slug: "home-accessories",
      nameEn: "Home Accessories",
      nameId: "Aksesori Rumah",
      description: "Textile-led decorative pieces and soft furnishings."
    }
  });

  await prisma.user.upsert({
    where: {email: "admin@natlovers.com"},
    update: {},
    create: {
      email: "admin@natlovers.com",
      name: "Natlovers Admin",
      role: UserRole.ADMIN,
      locale: Locale.en
    }
  });

  const products = [
    {
      slug: "simbok-nusantara-heirloom",
      titleEn: "Simbok Nusantara Heirloom",
      titleId: "Simbok Nusantara Pusaka",
      descriptionEn: "A collectible handbag layered with appliqued mothers, florals, and hand embroidery.",
      descriptionId: "Tas koleksi dengan detail ibu-ibu Nusantara, bunga, dan bordir tangan.",
      priceBase: 4250000,
      materialsEn: ["Natural fiber weave", "Leather handles", "Embroidery thread", "Textile dolls"],
      materialsId: ["Anyaman serat alami", "Pegangan kulit", "Benang bordir", "Boneka tekstil"],
      storyEn: "An ode to Javanese mothers and the tenderness of intergenerational craft.",
      storyId: "Sebuah penghormatan kepada ibu-ibu Jawa dan kelembutan kriya lintas generasi.",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"
      ],
      categoryId: bagCategory.id,
      isFeatured: true
    },
    {
      slug: "garden-procession-tote",
      titleEn: "Garden Procession Tote",
      titleId: "Garden Procession Tote",
      descriptionEn: "A whimsical tote with embroidered birds, crocheted blooms, and layered textures.",
      descriptionId: "Tote whimsical dengan bordir burung, bunga rajut, dan tekstur berlapis.",
      priceBase: 3650000,
      materialsEn: ["Handwoven base", "Crochet flowers", "Recycled fabrics"],
      materialsId: ["Dasar anyaman tangan", "Bunga rajut", "Kain daur ulang"],
      storyEn: "Designed as a living garden in motion, full of joyful color and dimensional craft.",
      storyId: "Dirancang seperti taman hidup yang bergerak, penuh warna ceria dan kriya dimensional.",
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"
      ],
      categoryId: bagCategory.id,
      isFeatured: true
    },
    {
      slug: "woven-story-runner",
      titleEn: "Woven Story Table Runner",
      titleId: "Table Runner Cerita Anyam",
      descriptionEn: "A decorative textile runner translating Natlovers storytelling into the home.",
      descriptionId: "Table runner dekoratif yang membawa cerita Natlovers ke dalam rumah.",
      priceBase: 1850000,
      materialsEn: ["Patchwork textiles", "Embroidery", "Hand stitching"],
      materialsId: ["Patchwork tekstil", "Bordir", "Jahit tangan"],
      storyEn: "For interiors that value craft as much as atmosphere.",
      storyId: "Untuk interior yang menghargai kriya sama besarnya dengan suasana.",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      galleryImageUrls: [],
      categoryId: homeCategory.id,
      isFeatured: false
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {slug: product.slug},
      update: {},
      create: {
        ...product,
        currencyBase: CurrencyCode.IDR,
        status: ProductStatus.PUBLISHED,
        stock: 1
      }
    });
  }

  const customer = await prisma.user.upsert({
    where: {email: "collector@example.com"},
    update: {},
    create: {
      email: "collector@example.com",
      name: "Gallery Collector",
      locale: Locale.en
    }
  });

  const featured = await prisma.product.findFirstOrThrow({where: {slug: "simbok-nusantara-heirloom"}});

  await prisma.order.upsert({
    where: {orderNumber: "NAT-2026-0001"},
    update: {},
    create: {
      orderNumber: "NAT-2026-0001",
      currency: CurrencyCode.USD,
      subtotal: 290,
      shipping: 35,
      total: 325,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      userId: customer.id,
      items: {
        create: [
          {
            quantity: 1,
            unitPrice: 290,
            title: featured.titleEn,
            productId: featured.id
          }
        ]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
