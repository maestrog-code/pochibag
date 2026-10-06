// ============================
// POCHIBAG — Product Catalog
// Verified products shown in supplied product images
// ============================

const PRODUCTS = [
  {
    id: 301,
    name: "Lara White Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "A 100ml Lara White Eau de Parfum from Manasik, presented in a clean white bottle with a warm metallic collar. A polished everyday fragrance for a soft, feminine finish.",
    notes: { top: "Fresh floral accords", heart: "Soft white florals", base: "Warm musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.31-dfHSoORPX3ATlygXAgjqaB3stxkVOo.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.31-dfHSoORPX3ATlygXAgjqaB3stxkVOo.jpeg"]
  },
  {
    id: 302,
    name: "Black XXL Pour Homme Eau de Toilette",
    category: "Perfumes",
    subcategory: "Eau de Toilette",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Black XXL Pour Homme by J. Collection is a 100ml Eau de Toilette with a bold black bottle and red detailing. A confident masculine scent made for evening wear and everyday presence.",
    notes: { top: "Fresh aromatic accords", heart: "Spiced woods", base: "Warm amber and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.31%20%281%29-zwa9eo04YcK0F78DlvfL2S17AxK66T.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.31%20%281%29-zwa9eo04YcK0F78DlvfL2S17AxK66T.jpeg"]
  },
  {
    id: 303,
    name: "Chic Girl Pink Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Chic Girl Pink is a 100ml Eau de Parfum in a playful pink high-heel bottle. Its bright presentation makes it a feminine fragrance choice and a distinctive gift.",
    notes: { top: "Fruity floral accords", heart: "Soft florals", base: "Sweet musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30%20%282%29-hMW0BomzRv89dB5xs3MEUXkNAHzwsP.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30%20%282%29-hMW0BomzRv89dB5xs3MEUXkNAHzwsP.jpeg"]
  },
  {
    id: 304,
    name: "Lara Candy Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Lara Candy by Manasik is a 100ml Eau de Parfum in a vivid pink bottle with a metallic collar. A sweet, bright fragrance designed for a playful feminine wardrobe.",
    notes: { top: "Sweet fruity accords", heart: "Floral candy accords", base: "Soft musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30%20%281%29-2cMt5YbJgu8qiNHgPQEi6A4l7LVnMK.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30%20%281%29-2cMt5YbJgu8qiNHgPQEi6A4l7LVnMK.jpeg"]
  },
  {
    id: 305,
    name: "Lara Pink Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Lara Pink by Manasik is a 100ml Eau de Parfum with a soft pink bottle and silver collar. Its delicate look suits light, feminine styling and gifting.",
    notes: { top: "Fresh floral accords", heart: "Powdery florals", base: "Clean musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30-2rFvnWLGTxkzS0eMp90oNajKFltDk3.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.30-2rFvnWLGTxkzS0eMp90oNajKFltDk3.jpeg"]
  },
  {
    id: 306,
    name: "You Are Mine Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "You Are Mine by J. Collection is a 100ml Eau de Parfum in a dark presentation box with a warm amber-coloured juice. A romantic fragrance for memorable evenings.",
    notes: { top: "Bright citrus accords", heart: "Warm floral notes", base: "Amber and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.29-iy2Cv1TSISv0ooTbO77n4ggfLIfu5d.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.29-iy2Cv1TSISv0ooTbO77n4ggfLIfu5d.jpeg"]
  },
  {
    id: 307,
    name: "Very Seductive Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Very Seductive is a 100ml BN Parfumes Eau de Parfum presented in a pink bottle with a striped ribbon. A feminine, giftable scent with a soft and glamorous character.",
    notes: { top: "Fruity accords", heart: "Romantic florals", base: "Sweet woods and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.29%20%281%29-qa1ggWI6akywplleDpQ3eTCzbpMBhT.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.29%20%281%29-qa1ggWI6akywplleDpQ3eTCzbpMBhT.jpeg"]
  },
  {
    id: 308,
    name: "Aswad Noir Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Aswad Noir is a 100ml Eau de Parfum in a deep navy bottle with a gold medallion and Arabic-inspired presentation. A dark, elegant fragrance for a refined signature.",
    notes: { top: "Spiced aromatic accords", heart: "Woody oriental accords", base: "Oud, amber and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28%20%282%29-FuyeV4PSVWlmvpBnnOMiOXWhBpK1HF.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28%20%282%29-FuyeV4PSVWlmvpBnnOMiOXWhBpK1HF.jpeg"]
  },
  {
    id: 309,
    name: "Shiny Pour Femme Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Shiny Pour Femme by BN Parfumes is a 100ml Eau de Parfum in a jewel-toned pink and violet bottle. A luminous feminine fragrance designed to stand out on a dressing table.",
    notes: { top: "Fruity fresh accords", heart: "Floral notes", base: "Soft woods and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28%20%281%29-IaVP5p00q95JJUiKzvHInw3HgLl2B5.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28%20%281%29-IaVP5p00q95JJUiKzvHInw3HgLl2B5.jpeg"]
  },
  {
    id: 310,
    name: "Aswad Aqua Eau de Parfum",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Aswad Aqua is a 100ml Eau de Parfum in a vivid blue bottle with a silver medallion. A fresh aquatic interpretation of the Aswad style for daytime wear.",
    notes: { top: "Fresh aquatic accords", heart: "Aromatic herbs and woods", base: "Clean musk and amber" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28-sQXzq07uez1Rc7V8DqSokm5Tf1qXfv.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.28-sQXzq07uez1Rc7V8DqSokm5Tf1qXfv.jpeg"]
  },
  {
    id: 311,
    name: "Manasik Oud Amber Ameerat",
    category: "Perfumes",
    subcategory: "Eau de Parfum",
    price: 2000,
    oldPrice: null,
    badge: "new",
    rating: "5.0",
    reviews: 0,
    sizes: ["100ml"],
    desc: "Manasik Oud Amber by Ameerat is a 100ml fragrance with an amber-toned bottle and ornate gold cap. A warm oud-and-amber profile suited to evening wear and special occasions.",
    notes: { top: "Warm spice accords", heart: "Oud and rose", base: "Amber, woods and musk" },
    img: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.27-RulrClhfhUKFEVmSMgxaLOXNS1erzQ.jpeg",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-10-06%20at%2012.40.27-RulrClhfhUKFEVmSMgxaLOXNS1erzQ.jpeg"]
  }
];

const TRENDING = [
  { rank: 1, name: "Lara White Eau de Parfum", category: "Perfumes", price: "₹2,000", id: 301, img: PRODUCTS[0].img },
  { rank: 2, name: "Aswad Noir Eau de Parfum", category: "Perfumes", price: "₹2,000", id: 308, img: PRODUCTS[7].img },
  { rank: 3, name: "Manasik Oud Amber Ameerat", category: "Perfumes", price: "₹2,000", id: 311, img: PRODUCTS[10].img },
  { rank: 4, name: "Chic Girl Pink Eau de Parfum", category: "Perfumes", price: "₹2,000", id: 303, img: PRODUCTS[2].img }
];

const PRODUCT_SOURCES = {
  desertcart: "https://www.desertcart.in/"
};

if (typeof window !== "undefined") {
  window.PRODUCT_SOURCES = PRODUCT_SOURCES;
}

if (typeof module !== "undefined") module.exports = { PRODUCTS, TRENDING };

if (typeof window !== "undefined") {
  window.PRODUCTS = PRODUCTS;
  window.TRENDING = TRENDING;
}
