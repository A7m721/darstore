// =========================================================
// customer.js — منطق واجهة العملاء (index.html)
// =========================================================
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { db, auth } from "./firebase-config.js";

/* ---------------- State ---------------- */
let ALL_PRODUCTS = [];
let ALL_CATEGORIES = [];
let REVIEWS = [];
let SETTINGS = {};
let catalogInitiallyLoaded = false;
let currentCategory = "all";
let currentSearch = "";
let currentSort = "newest";
let cart = JSON.parse(localStorage.getItem("store_cart") || "[]").map(item => ({
  cartKey: item.cartKey || (item.variantId ? `${item.id}::${item.variantId}` : item.id),
  id: item.id,
  variantId: item.variantId || null,
  variantLabel: item.variantLabel || null,
  qty: item.qty
}));
let wishlist = JSON.parse(localStorage.getItem("store_wishlist") || "[]");
let recentlyViewed = JSON.parse(localStorage.getItem("store_recently_viewed") || "[]");
let appliedCoupon = null;
let CUSTOMER_PROFILE = null;
const LOW_STOCK_THRESHOLD = 5;

/* ---------------- i18n (واجهة الموقع فقط — بيانات المنتجات تبقى كما أدخلها الأدمن) ---------------- */
const I18N = {
  ar: {
    search_placeholder: "ابحث عن منتج...", track_orders: "طلباتي", wishlist: "المفضلة", cart: "السلة",
    all_products: "جميع المنتجات", all_categories: "الكل", sort_by: "ترتيب حسب", sort_newest: "الأحدث", sort_bestselling: "الأكثر مبيعًا",
    sort_price_asc: "السعر: من الأقل للأعلى", sort_price_desc: "السعر: من الأعلى للأقل",
    recently_viewed: "شاهدتها مؤخرًا",
    trust_shipping_title: "شحن سريع", trust_shipping_sub: "توصيل لجميع المناطق",
    trust_payment_title: "دفع آمن", trust_payment_sub: "عند الاستلام أو أونلاين",
    trust_return_title: "ضمان استرجاع", trust_return_sub: "خلال فترة محددة",
    trust_support_title: "دعم فوري", trust_support_sub: "عبر واتساب في أي وقت",
    trust_badge_shipping: "شحن سريع", trust_badge_payment: "دفع آمن", trust_badge_return: "ضمان استرجاع",
    details: "التفاصيل", add_to_cart: "أضف للسلة", select_option: "اختر الخيار", quick_view: "معاينة سريعة",
    out_of_stock: "غير متوفر", no_products: "لا توجد منتجات مطابقة", no_rating: "لا يوجد تقييم",
    please_select_option: "الرجاء اختيار الخيار المناسب", option_unavailable: "هذا الخيار غير متوفر",
    available_qty: "الكمية المتاحة", add_to_cart_full: "إضافة للسلة",
    reviews_title: "التقييمات والمراجعات", no_reviews: "لا توجد تقييمات بعد، كن أول من يقيّم هذا المنتج",
    add_review: "أضف تقييمك", your_name: "اسمك", review_comment_placeholder: "رأيك في المنتج (اختياري)",
    submit_review: "إرسال التقييم", related_products: "منتجات مشابهة",
    cart_title: "سلة المشتريات", cart_empty: "سلتك فارغة حاليًا", total: "الإجمالي", checkout: "إتمام الشراء", remove: "إزالة",
    wishlist_title: "المفضلة", wishlist_empty: "قائمة المفضلة فارغة حاليًا", move_to_cart: "أضف للسلة",
    checkout_title: "إتمام الطلب", full_name: "الاسم الكامل", phone_number: "رقم الهاتف", address_label: "العنوان بالتفصيل",
    coupon_placeholder: "كود الخصم (اختياري)", apply: "تطبيق", subtotal: "المجموع الفرعي", discount: "خصم",
    confirm_order: "تأكيد الطلب", sending_order: "جاري إرسال الطلب...",
    order_success: "تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.", track_now: "تتبع حالة طلبك الآن",
    my_orders: "طلباتي", back_to_store: "→ رجوع للمتجر",
    my_orders_sub: "سجّل دخول لمتابعة حالة كل طلباتك", search: "بحث",
    footer_links: "روابط", footer_privacy: "سياسة الخصوصية", footer_terms: "الشروط والأحكام",
    footer_about: "من نحن", footer_faq: "الأسئلة الشائعة",
    footer_contact: "تواصل معنا", footer_whatsapp: "واتساب",
    status_new: "جديد", status_processing: "قيد التجهيز", status_shipped: "تم الشحن",
    status_delivered: "تم التسليم", status_cancelled: "ملغي", order_cancelled_msg: "تم إلغاء هذا الطلب",
    searching: "جاري البحث...", no_orders_found: "لم يتم العثور على أي طلبات بهذا الرقم"
  },
  en: {
    search_placeholder: "Search for a product...", track_orders: "My Orders", wishlist: "Wishlist", cart: "Cart",
    all_products: "All Products", all_categories: "All", sort_by: "Sort by", sort_newest: "Newest", sort_bestselling: "Best selling",
    sort_price_asc: "Price: Low to High", sort_price_desc: "Price: High to Low",
    recently_viewed: "Recently Viewed",
    trust_shipping_title: "Fast Shipping", trust_shipping_sub: "Delivery to all areas",
    trust_payment_title: "Secure Payment", trust_payment_sub: "Cash on delivery or online",
    trust_return_title: "Return Guarantee", trust_return_sub: "Within a set period",
    trust_support_title: "Instant Support", trust_support_sub: "Via WhatsApp anytime",
    trust_badge_shipping: "Fast Shipping", trust_badge_payment: "Secure Payment", trust_badge_return: "Return Guarantee",
    details: "Details", add_to_cart: "Add to Cart", select_option: "Select Option", quick_view: "Quick View",
    out_of_stock: "Out of Stock", no_products: "No matching products", no_rating: "No ratings",
    please_select_option: "Please select an option", option_unavailable: "This option is unavailable",
    available_qty: "Available quantity", add_to_cart_full: "Add to Cart",
    reviews_title: "Reviews & Ratings", no_reviews: "No reviews yet — be the first to review this product",
    add_review: "Add your review", your_name: "Your name", review_comment_placeholder: "Your thoughts about the product (optional)",
    submit_review: "Submit Review", related_products: "Related Products",
    cart_title: "Shopping Cart", cart_empty: "Your cart is empty", total: "Total", checkout: "Checkout", remove: "Remove",
    wishlist_title: "Wishlist", wishlist_empty: "Your wishlist is empty", move_to_cart: "Add to Cart",
    checkout_title: "Complete Order", full_name: "Full Name", phone_number: "Phone Number", address_label: "Full Address",
    coupon_placeholder: "Discount code (optional)", apply: "Apply", subtotal: "Subtotal", discount: "Discount",
    confirm_order: "Confirm Order", sending_order: "Sending order...",
    order_success: "Your order was sent successfully! We'll contact you soon.", track_now: "Track your order now",
    my_orders: "My Orders", back_to_store: "→ Back to Store",
    my_orders_sub: "Sign in to track all your orders", search: "Search",
    footer_links: "Links", footer_privacy: "Privacy Policy", footer_terms: "Terms & Conditions",
    footer_about: "About Us", footer_faq: "FAQ",
    footer_contact: "Contact Us", footer_whatsapp: "WhatsApp",
    status_new: "New", status_processing: "Processing", status_shipped: "Shipped",
    status_delivered: "Delivered", status_cancelled: "Cancelled", order_cancelled_msg: "This order was cancelled",
    searching: "Searching...", no_orders_found: "No orders found with this number"
  }
};
let currentLang = localStorage.getItem("store_lang") || "ar";

/* ---------------- Theme (Light/Dark) ---------------- */
function getInitialTheme() {
  const saved = localStorage.getItem("store_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
let currentTheme = getInitialTheme();

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("store_theme", theme);
  const moonIcon = $("#theme-icon-moon");
  const sunIcon = $("#theme-icon-sun");
  if (moonIcon && sunIcon) {
    moonIcon.style.display = theme === "light" ? "" : "none";
    sunIcon.style.display = theme === "light" ? "none" : "";
  }
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", theme === "light" ? "#F7F6F2" : "#0B1512");
}

function toggleTheme() {
  applyTheme(currentTheme === "light" ? "dark" : "light");
}
function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || I18N.ar[key] || key; }
const STATUS_I18N_KEYS = { "جديد": "status_new", "قيد التجهيز": "status_processing", "تم الشحن": "status_shipped", "تم التسليم": "status_delivered", "ملغي": "status_cancelled" };
function statusLabel(status) { return t(STATUS_I18N_KEYS[status] || status); }

function applyStaticI18n() {
  document.documentElement.lang = currentLang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  const toggleBtn = $("#lang-toggle-btn");
  if (toggleBtn) toggleBtn.textContent = currentLang === "ar" ? "EN" : "AR";
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("store_lang", lang);
  applyStaticI18n();
  renderCategories();
  renderProducts();
  renderRecentlyViewed();
  if ($("#cart-drawer").classList.contains("open")) renderCartDrawer();
  if ($("#wishlist-drawer").classList.contains("open")) renderWishlistDrawer();
}
let heroSlideIndex = 0;
let heroTimer = null;

/* ---------------- Helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const money = (n) => `${Number(n || 0).toLocaleString("ar-EG")} ج.م`;
const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toIntlWhatsApp(phone) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "20" + digits.slice(1); // افتراضي: مصر (+20) — عدّل حسب دولة متجرك
  return digits;
}

/* ---------------- Modal utils ---------------- */
function openModal(sel) {
  $(sel).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(sel) {
  $(sel).classList.remove("open");
  document.body.style.overflow = "";
}

async function shareProduct(p) {
  const url = `${location.href.split("#")[0]}#/product/${p.id}`;
  const text = `${p.name} — ${money(p.price)}\n${url}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: p.name, text: `${p.name} — ${money(p.price)}`, url });
      return;
    } catch (e) { /* المستخدم لغى المشاركة، لا داعي لأي إجراء */ return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("تم نسخ رابط المنتج 🔗");
  } catch (e) {
    showToast("رابط المنتج: " + url);
  }
}

function renderStars(avg) {
  const rounded = Math.round(avg || 0);
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) html += `<span class="${i <= rounded ? "" : "star-empty"}">★</span>`;
  return html + "</span>";
}

function getReviewStats(productId) {
  const list = REVIEWS.filter(r => r.productId === productId);
  if (!list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return { avg: sum / list.length, count: list.length };
}

function renderFeaturedReviews() {
  const section = $("#featured-reviews-section");
  const track = $("#featured-reviews-track");
  if (!section || !track) return;

  const best = REVIEWS
    .filter(r => Number(r.rating) >= 4 && (r.comment || "").trim())
    .sort((a, b) => (b.rating - a.rating) || ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
    .slice(0, 8);

  if (!best.length) { section.style.display = "none"; return; }
  section.style.display = "";

  track.innerHTML = best.map(r => {
    const product = ALL_PRODUCTS.find(p => p.id === r.productId);
    const initial = escapeHtml((r.customerName || "ع").trim().charAt(0) || "ع");
    return `
      <div class="testimonial-card">
        ${renderStars(r.rating)}
        <p class="testimonial-comment">${escapeHtml(r.comment)}</p>
        <div class="testimonial-footer">
          <div class="testimonial-avatar">${initial}</div>
          <div>
            <div class="testimonial-name">${escapeHtml(r.customerName || "عميل")}</div>
            ${product ? `<div class="testimonial-product">${escapeHtml(product.name || "")}</div>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

function saveCart() {
  localStorage.setItem("store_cart", JSON.stringify(cart));
  renderCartCount();
  if (auth.currentUser) {
    setDoc(doc(db, "customerProfiles", auth.currentUser.uid), { cart }, { merge: true }).catch(() => {});
  }
}

/* ---------------- Settings ---------------- */
function listenSettings() {
  return new Promise((resolve) => {
    onSnapshot(doc(db, "settings", "main"), (snap) => {
      SETTINGS = snap.exists() ? snap.data() : {};
      applySettings();
      resolve();
    }, (e) => {
      console.error("خطأ في متابعة الإعدادات:", e);
      SETTINGS = {};
      resolve();
    });
  });
}

function applySettings() {
  const s = SETTINGS;
  if (s.storeName) {
    $("#store-name").textContent = s.storeName;
    $("#footer-store-name").textContent = s.storeName;
    $("#page-title").textContent = s.storeName;
  }
  if (s.logoUrl) $("#store-logo").src = s.logoUrl;
  if (s.faviconUrl) $("#favicon").href = s.faviconUrl;
  if (s.phone) {
    $("#topbar-phone").textContent = s.phone;
    $("#topbar-phone-item").style.display = "flex";
    $("#topbar-dot").style.display = "";
  }
  if (s.phone) $("#footer-phone").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2z"/></svg><span>${escapeHtml(s.phone)}</span>`;
  if (s.email) $("#footer-email").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span>${escapeHtml(s.email)}</span>`;
  if (s.address) $("#footer-address").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.3"/></svg><span>${escapeHtml(s.address)}</span>`;
  if (s.privacyPolicy) $("#link-privacy").onclick = (e) => {
    e.preventDefault(); openTextModal("سياسة الخصوصية", s.privacyPolicy);
  };
  if (s.termsAndConditions) $("#link-terms").onclick = (e) => {
    e.preventDefault(); openTextModal("الشروط والأحكام", s.termsAndConditions);
  };
  if (s.aboutText) {
    $("#link-about").style.display = "";
    $("#link-about").onclick = (e) => { e.preventDefault(); openTextModal("من نحن", s.aboutText); };
  }
  if (s.faqText) {
    $("#link-faq").style.display = "";
    $("#link-faq").onclick = (e) => { e.preventDefault(); openTextModal("الأسئلة الشائعة", s.faqText); };
  }
  if (s.gaId) setupGoogleAnalytics(s.gaId);
  if (s.whatsapp) $("#link-whatsapp").href = `https://wa.me/${toIntlWhatsApp(s.whatsapp)}`;
  if (s.whatsapp) {
    $("#floating-whatsapp-btn").href = `https://wa.me/${toIntlWhatsApp(s.whatsapp)}`;
    $("#floating-whatsapp-btn").style.display = "flex";
  }

  const social = $("#footer-social");
  social.innerHTML = "";
  if (s.facebook) social.innerHTML += `<a href="${s.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.6V3.7C15.9 3.6 15 3.5 14 3.5c-2.4 0-4 1.4-4 4.1v2.3H7.3V13H10v8h3.5z"/></svg></a>`;
  if (s.instagram) social.innerHTML += `<a href="${s.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>`;
  if (s.whatsapp) social.innerHTML += `<a href="https://wa.me/${toIntlWhatsApp(s.whatsapp)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.03 3C7.14 3 3.55 6.6 3.55 11.47c0 1.62.44 3.15 1.2 4.44L3.3 20l4.24-1.26a8.4 8.4 0 0 0 4.5 1.23c4.9 0 8.9-3.6 8.9-8.5S16.93 3 12.03 3zm0 15.4c-1.4 0-2.7-.4-3.8-1.1l-.27-.16-2.6.77.8-2.5-.18-.26a6.9 6.9 0 0 1-1.1-3.7c0-3.8 3.1-6.9 7.15-6.9 3.9 0 7.1 3.1 7.1 6.9 0 3.9-3.2 6.95-7.1 6.95z"/></svg></a>`;

  const topbarSocial = $("#topbar-social");
  topbarSocial.innerHTML = "";
  if (s.facebook) topbarSocial.innerHTML += `<a href="${s.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.6V3.7C15.9 3.6 15 3.5 14 3.5c-2.4 0-4 1.4-4 4.1v2.3H7.3V13H10v8h3.5z"/></svg></a>`;
  if (s.instagram) topbarSocial.innerHTML += `<a href="${s.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>`;
  if (s.whatsapp) topbarSocial.innerHTML += `<a href="https://wa.me/${toIntlWhatsApp(s.whatsapp)}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.03 3C7.14 3 3.55 6.6 3.55 11.47c0 1.62.44 3.15 1.2 4.44L3.3 20l4.24-1.26a8.4 8.4 0 0 0 4.5 1.23c4.9 0 8.9-3.6 8.9-8.5S16.93 3 12.03 3zm0 15.4c-1.4 0-2.7-.4-3.8-1.1l-.27-.16-2.6.77.8-2.5-.18-.26a6.9 6.9 0 0 1-1.1-3.7c0-3.8 3.1-6.9 7.15-6.9 3.9 0 7.1 3.1 7.1 6.9 0 3.9-3.2 6.95-7.1 6.95z"/></svg></a>`;

  $("#footer-year").textContent = new Date().getFullYear();

  renderStoreOpenStatus(s.workingHours);
  renderHappyCustomers(s.customerCount);
  updateOpenGraphMeta(s);
  setupPWA(s);
}

const WEEK_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function renderStoreOpenStatus(workingHours) {
  const badge = $("#store-open-badge");
  if (!workingHours) { badge.style.display = "none"; return; }
  const now = new Date();
  const dayKey = WEEK_DAY_KEYS[now.getDay()];
  const today = workingHours[dayKey];
  if (!today) { badge.style.display = "none"; return; }

  let isOpen = false;
  if (!today.closed) {
    const [openH, openM] = (today.open || "10:00").split(":").map(Number);
    const [closeH, closeM] = (today.close || "22:00").split(":").map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    isOpen = nowMinutes >= (openH * 60 + openM) && nowMinutes < (closeH * 60 + closeM);
  }

  badge.style.display = "inline-flex";
  badge.classList.toggle("is-closed", !isOpen);
  $("#store-open-text").textContent = isOpen ? "مفتوح الآن" : "مغلق حاليًا";
}

function renderHappyCustomers(count) {
  const badge = $("#happy-customers-badge");
  if (!count || count < 5) { badge.style.display = "none"; return; }
  badge.style.display = "inline-flex";
  $("#happy-customers-text").textContent = `+${count.toLocaleString("ar-EG")} عميل وثق بينا`;
}

function updateOpenGraphMeta(s) {
  const setMeta = (property, content) => {
    if (!content) return;
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("property", property);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  };
  setMeta("og:title", s.storeName || "المتجر الإلكتروني");
  setMeta("og:description", s.address || "تسوق أفضل المنتجات بأسعار مميزة");
  setMeta("og:image", s.logoUrl || "");
  setMeta("og:url", location.href.split("#")[0]);
  setMeta("og:type", "website");
}

function setupPWA(s) {
  const name = s.storeName || "المتجر الإلكتروني";
  const icon = s.logoUrl || s.faviconUrl || "";

  const manifest = {
    name,
    short_name: name,
    start_url: location.pathname,
    scope: location.pathname,
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "ar",
    background_color: "#0B1512",
    theme_color: "#0B1512",
    icons: icon ? [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ] : []
  };

  try {
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    $("#pwa-manifest-link").href = URL.createObjectURL(blob);
  } catch (e) {
    console.error("خطأ في إعداد ملف PWA manifest:", e);
  }

  $("#pwa-apple-title").content = name;
  if (icon) $("#pwa-apple-icon").href = icon;
}

function setupGoogleAnalytics(gaId) {
  if (!gaId || window.__gaLoaded) return;
  window.__gaLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", gaId);
}

function openTextModal(title, text) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:600px; padding:36px;">
      <button class="modal-close" style="position:absolute;">✕</button>
      <h3 style="margin-bottom:16px;">${title}</h3>
      <p style="white-space:pre-line; color:#5b665e; font-size:14.5px; line-height:1.9;">${text}</p>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

/* ---------------- Banners ---------------- */
function listenBanners() {
  const q = query(collection(db, "banners"), orderBy("order", "asc"));
  return new Promise((resolve) => {
    onSnapshot(q, (snap) => {
      const now = Date.now();
      const banners = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.active !== false && (!b.expiresAt || new Date(b.expiresAt).getTime() > now));
      renderHero(banners);
      resolve();
    }, (e) => {
      console.error("خطأ في متابعة البانرات:", e);
      $("#hero-section").style.display = "none";
      resolve();
    });
  });
}

function formatCountdown(ms) {
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `ينتهي العرض خلال ${days} يوم و${hours} ساعة`;
  if (hours > 0) return `ينتهي العرض خلال ${hours} ساعة و${minutes} دقيقة`;
  return `ينتهي العرض خلال ${minutes} دقيقة`;
}

let heroCountdownTimer = null;
function updateHeroCountdowns() {
  $$(".hero-countdown").forEach(el => {
    const ms = new Date(el.dataset.expires).getTime() - Date.now();
    const text = formatCountdown(ms);
    if (!text) { el.style.display = "none"; return; }
    el.textContent = text;
  });
}

function renderHero(banners) {
  if (!banners.length) { $("#hero-section").style.display = "none"; return; }
  $("#hero-section").style.display = "";
  const track = $("#hero-track");
  const dots = $("#hero-dots");
  track.innerHTML = banners.map((b, i) => `
    <div class="hero-slide ${i === 0 ? "active" : ""}" data-i="${i}" data-style="${b.style || "classic"}">
      <div class="hero-content">
        <span class="hero-eyebrow">عرض مميز</span>
        <h2>${b.title || ""}</h2>
        <p>${b.description || ""}</p>
        ${b.expiresAt ? `<span class="hero-countdown" data-expires="${b.expiresAt}"></span>` : ""}
        ${b.buttonLink ? `<a class="btn" href="${b.buttonLink}">تسوق الآن</a>` : ""}
      </div>
    </div>`).join("");
  dots.innerHTML = banners.map((_, i) => `<span data-i="${i}" class="${i === 0 ? "active" : ""}"></span>`).join("");
  dots.querySelectorAll("span").forEach(s => s.onclick = () => setHeroSlide(+s.dataset.i, banners.length));

  clearInterval(heroTimer);
  if (banners.length > 1) {
    heroTimer = setInterval(() => setHeroSlide((heroSlideIndex + 1) % banners.length, banners.length), 5000);
  }

  clearInterval(heroCountdownTimer);
  updateHeroCountdowns();
  heroCountdownTimer = setInterval(updateHeroCountdowns, 30000);
}

function setHeroSlide(i, total) {
  heroSlideIndex = i;
  $$("#hero-track .hero-slide").forEach(el => el.classList.toggle("active", +el.dataset.i === i));
  $$("#hero-dots span").forEach(el => el.classList.toggle("active", +el.dataset.i === i));
}

/* ---------------- Categories ---------------- */
function listenCategories() {
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  return new Promise((resolve) => {
    onSnapshot(q, (snap) => {
      ALL_CATEGORIES = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCategories();
      if (catalogInitiallyLoaded) renderCatalog();
      resolve();
    }, (e) => {
      console.error("خطأ في متابعة الأقسام:", e);
      ALL_CATEGORIES = [];
      renderCategories();
      resolve();
    });
  });
}

function renderCategories() {
  const track = $("#cats-track");
  const navList = $("#nav-categories-list");

  track.innerHTML = `
    <div class="cat-pill ${currentCategory === "all" ? "active" : ""}" data-cat="all">
      <div class="circle">🛍️</div><span>${t("all_categories")}</span>
    </div>` +
    ALL_CATEGORIES.map(c => `
      <div class="cat-pill ${currentCategory === c.id ? "active" : ""}" data-cat="${c.id}">
        <div class="circle"><img src="${c.imageUrl || ""}" alt="${c.name || ""}"></div>
        <span>${c.name || ""}</span>
      </div>`).join("");

  navList.innerHTML = `<li><a href="#products" data-cat="all" class="nav-cat-link">${t("all_products")}</a></li>` +
    ALL_CATEGORIES.map(c => `<li><a href="#products" data-cat="${c.id}" class="nav-cat-link">${c.name || ""}</a></li>`).join("");

  $$(".cat-pill").forEach(el => el.onclick = () => { currentCategory = el.dataset.cat; renderCategories(); renderCatalog(); });
  $$(".nav-cat-link").forEach(el => el.onclick = () => { currentCategory = el.dataset.cat; renderCategories(); renderCatalog(); });
}

/* ---------------- Reviews ---------------- */
function listenReviews() {
  return new Promise((resolve) => {
    onSnapshot(collection(db, "reviews"), (snap) => {
      REVIEWS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (catalogInitiallyLoaded) renderCatalog();
      renderFeaturedReviews();
      resolve();
    }, (e) => {
      console.error("خطأ في متابعة التقييمات:", e);
      REVIEWS = [];
      resolve();
    });
  });
}

/* ---------------- Products ---------------- */
function listenProducts() {
  return new Promise((resolve) => {
    onSnapshot(collection(db, "products"), (snap) => {
      ALL_PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      catalogInitiallyLoaded = true;
      renderProducts();
      renderFeaturedReviews();
      resolve();
    }, (e) => {
      console.error("خطأ في متابعة المنتجات:", e);
      ALL_PRODUCTS = [];
      catalogInitiallyLoaded = true;
      renderProducts();
      resolve();
    });
  });
}

function getFilteredProducts() {
  const list = ALL_PRODUCTS.filter(p => {
    const matchesCat = currentCategory === "all" || p.category === currentCategory;
    const s = currentSearch.trim().toLowerCase();
    const matchesSearch = !s || (p.name || "").toLowerCase().includes(s) || (p.description || "").toLowerCase().includes(s);
    return matchesCat && matchesSearch;
  });

  const sorted = list.slice();
  if (currentSort === "price-asc") sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (currentSort === "price-desc") sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
  else if (currentSort === "bestselling") sorted.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  else sorted.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return sorted;
}

function renderProducts() {
  const grid = $("#products-grid");
  const list = getFilteredProducts();
  $("#products-title").textContent = currentCategory === "all"
    ? t("all_products")
    : (ALL_CATEGORIES.find(c => c.id === currentCategory)?.name || t("all_products"));

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">${t("no_products")}</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    const discountPct = hasDiscount ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const hasVariants = !!(p.variants && p.variants.length);
    const outOfStock = hasVariants
      ? p.variants.every(v => Number(v.quantity) <= 0)
      : (p.status === "unavailable" || Number(p.quantity) <= 0);
    const totalQty = hasVariants ? p.variants.reduce((s, v) => s + (Number(v.quantity) || 0), 0) : Number(p.quantity) || 0;
    const isLowStock = !outOfStock && totalQty > 0 && totalQty <= LOW_STOCK_THRESHOLD;
    const stats = getReviewStats(p.id);
    const inWishlist = wishlist.includes(p.id);
    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-thumb" data-action="details">
        <img src="${p.mainImage || ""}" alt="${p.name || ""}" loading="lazy" onload="this.classList.add('loaded')">
        ${hasDiscount ? `<span class="badge-discount">${t("discount")} ${discountPct}%</span>` : (p.label ? `<span class="badge-label">${escapeHtml(p.label)}</span>` : "")}
        <button class="wishlist-btn ${inWishlist ? "active" : ""}" data-action="wishlist" aria-label="Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6c-1.7-1.5-4.4-1.5-6 .2L12 7.6l-2.8-2.8c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.2L12 20l8.8-8.9c1.7-1.8 1.7-4.6 0-6.3z"/></svg>
        </button>
        <button class="quickview-btn" data-action="details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          ${t("quick_view")}
        </button>
        ${outOfStock ? `<div class="badge-oos">${t("out_of_stock")}</div>` : ""}
        ${isLowStock ? `<span class="badge-lowstock">⚡ ${totalQty}</span>` : ""}
      </div>
      <div class="product-info">
        <div class="product-name" data-action="details">${p.name || ""}</div>
        <div class="rating-row">${renderStars(stats.avg)} <span>${stats.count ? `${stats.avg.toFixed(1)} (${stats.count})` : t("no_rating")}</span></div>
        <div class="price-row">
          <span class="price-now">${money(p.price)}</span>
          ${hasDiscount ? `<span class="price-old">${money(p.oldPrice)}</span>` : ""}
        </div>
        <div class="product-actions">
          <button class="btn-details" data-action="details">${t("details")}</button>
          <button class="btn-add" data-action="add" ${outOfStock ? "disabled" : ""}>${hasVariants ? t("select_option") : t("add_to_cart")}</button>
        </div>
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".product-card").forEach(card => {
    const id = card.dataset.id;
    const product = ALL_PRODUCTS.find(x => x.id === id);
    const hasVariants = !!(product?.variants && product.variants.length);
    card.querySelectorAll('[data-action="details"]').forEach(el => el.onclick = () => openDetailModal(id));
    const addBtn = card.querySelector('[data-action="add"]');
    if (addBtn) addBtn.onclick = () => hasVariants ? openDetailModal(id) : addToCart(id, 1);
    const wishBtn = card.querySelector('[data-action="wishlist"]');
    if (wishBtn) wishBtn.onclick = (e) => {
      e.stopPropagation();
      toggleWishlist(id);
      wishBtn.classList.toggle("active", wishlist.includes(id));
    };
  });
}

/* ---------------- Product detail modal ---------------- */
/* ---------------- Mini product cards (recently viewed / related) ---------------- */
function miniCardHtml(p) {
  return `<div class="mini-product-card" data-id="${p.id}">
    <img src="${p.mainImage || ""}" alt="${p.name || ""}" loading="lazy">
    <div class="mp-info">
      <div class="mp-name">${p.name || ""}</div>
      <div class="mp-price">${money(p.price)}</div>
    </div>
  </div>`;
}
function bindMiniCards(container) {
  container.querySelectorAll(".mini-product-card").forEach(el => el.onclick = () => openDetailModal(el.dataset.id));
}

/* ---------------- Recently viewed ---------------- */
function trackRecentlyViewed(id) {
  recentlyViewed = [id, ...recentlyViewed.filter(x => x !== id)].slice(0, 8);
  localStorage.setItem("store_recently_viewed", JSON.stringify(recentlyViewed));
}

function renderRecentlyViewed() {
  const section = $("#recently-viewed-section");
  const row = $("#recently-viewed-row");
  const items = recentlyViewed.map(id => ALL_PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if (!items.length) { section.style.display = "none"; return; }
  section.style.display = "";
  row.innerHTML = items.map(miniCardHtml).join("");
  bindMiniCards(row);
}

function openDetailModal(productId) {
  const p = ALL_PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const images = [p.mainImage, ...(p.images || [])].filter(Boolean);
  const hasVariants = !!(p.variants && p.variants.length);
  const variantColors = hasVariants ? [...new Set(p.variants.map(v => v.color).filter(Boolean))] : [];
  const variantSizes = hasVariants ? [...new Set(p.variants.map(v => v.size).filter(Boolean))] : [];
  const outOfStock = hasVariants
    ? p.variants.every(v => Number(v.quantity) <= 0)
    : (p.status === "unavailable" || Number(p.quantity) <= 0);
  const catName = ALL_CATEGORIES.find(c => c.id === p.category)?.name || "";
  const hasDiscount = p.oldPrice && p.oldPrice > p.price;
  const stats = getReviewStats(p.id);
  const inWishlist = wishlist.includes(p.id);
  const productReviews = REVIEWS.filter(r => r.productId === p.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  let related = ALL_PRODUCTS.filter(x => x.id !== p.id && x.category === p.category);
  if (!related.length) related = ALL_PRODUCTS.filter(x => x.id !== p.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  related = related.slice(0, 6);

  $("#detail-content").innerHTML = `
    <div class="detail-gallery">
      <div class="main-img"><img id="detail-main-img" src="${images[0] || ""}"></div>
      <div class="thumb-row">
        ${images.map((img, i) => `<img src="${img}" class="${i === 0 ? "active" : ""}" data-src="${img}">`).join("")}
      </div>
    </div>
    <div class="detail-info">
      <div class="detail-cat">${catName}</div>
      <h2>${p.name || ""}</h2>
      <div class="rating-row">${renderStars(stats.avg)} <span>${stats.count ? `${stats.avg.toFixed(1)} (${stats.count} تقييم)` : "لا يوجد تقييمات بعد"}</span></div>
      <p class="detail-desc">${p.description || ""}</p>
      <div class="detail-price-row" id="detail-price-row">
        <span class="price-now">${money(p.price)}</span>
        ${hasDiscount ? `<span class="price-old">${money(p.oldPrice)}</span>` : ""}
      </div>
      ${hasVariants ? `
      <div class="variant-selector" id="variant-selector">
        ${variantColors.length ? `<div class="variant-group"><label>اللون</label><div class="variant-options" id="color-options">
          ${variantColors.map(c => `<button type="button" class="variant-chip" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("")}
        </div></div>` : ""}
        ${variantSizes.length ? `<div class="variant-group"><label>المقاس</label><div class="variant-options" id="size-options">
          ${variantSizes.map(s => `<button type="button" class="variant-chip" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("")}
        </div></div>` : ""}
      </div>` : ""}
      <div class="detail-stock" id="detail-stock">${outOfStock ? "غير متوفر حاليًا" : (hasVariants ? "الرجاء اختيار الخيار المناسب" : (Number(p.quantity) <= LOW_STOCK_THRESHOLD ? `<span class="low-stock-text">⚡ متبقي ${p.quantity} قطع فقط — اطلب الآن</span>` : `الكمية المتاحة: ${p.quantity ?? "-"}`))}</div>
      ${outOfStock ? `
      <div class="stock-alert-box" id="stock-alert-box">
        <p class="stock-alert-label">حابب تعرف لما يتوفر تاني؟</p>
        <div class="stock-alert-row">
          <input type="tel" id="stock-alert-phone" placeholder="رقم هاتفك">
          <button type="button" id="stock-alert-btn" class="btn-track-search">نبّهني</button>
        </div>
      </div>` : ""}
      <div class="trust-badges-mini">
        <span class="trust-badge-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="7" width="14" height="10"/><path d="M15 10h3.5l3.5 3.5V17h-7z"/></svg> شحن سريع</span>
        <span class="trust-badge-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 10h20"/></svg> دفع آمن</span>
        <span class="trust-badge-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg> ضمان استرجاع</span>
      </div>
      <div class="qty-row">
        <div class="qty-control">
          <button id="qty-minus">−</button>
          <span id="qty-value">1</span>
          <button id="qty-plus">+</button>
        </div>
      </div>
      <div class="detail-actions-row">
        <button class="detail-add-btn" id="detail-add-btn" ${outOfStock || hasVariants ? "disabled" : ""}>إضافة للسلة</button>
        <button class="detail-wishlist-btn ${inWishlist ? "active" : ""}" id="detail-wishlist-btn" aria-label="المفضلة">
          <svg viewBox="0 0 24 24"><path d="M20.8 4.6c-1.7-1.5-4.4-1.5-6 .2L12 7.6l-2.8-2.8c-1.6-1.7-4.3-1.7-6 0-1.7 1.7-1.7 4.4 0 6.2L12 20l8.8-8.9c1.7-1.8 1.7-4.6 0-6.3z"/></svg>
        </button>
        <button class="detail-wishlist-btn" id="detail-share-btn" aria-label="مشاركة">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4"/></svg>
        </button>
      </div>
    </div>
    ${related.length ? `
    <div class="related-section">
      <h4>منتجات مشابهة</h4>
      <div class="mini-products-row">${related.map(miniCardHtml).join("")}</div>
    </div>` : ""}
    <div class="reviews-section">
      <div class="reviews-header">
        <h4>التقييمات والمراجعات</h4>
        <div class="reviews-summary">
          <span class="avg-num">${stats.count ? stats.avg.toFixed(1) : "–"}</span>
          ${renderStars(stats.avg)}
          <span style="color:var(--text-muted); font-size:12.5px;">(${stats.count} تقييم)</span>
        </div>
      </div>
      <div class="reviews-list">
        ${productReviews.length ? productReviews.map(r => `
          <div class="review-item">
            <div class="review-item-head">
              <strong>${escapeHtml(r.customerName || "عميل")}</strong>
              <span class="review-date">${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("ar-EG") : ""}</span>
            </div>
            ${renderStars(r.rating)}
            ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : ""}
          </div>`).join("") : `<div class="no-reviews">لا توجد تقييمات بعد، كن أول من يقيّم هذا المنتج</div>`}
      </div>
      <form class="review-form" id="review-form">
        <h5>أضف تقييمك</h5>
        <div class="star-picker" id="star-picker">
          ${[1, 2, 3, 4, 5].map(n => `<span data-val="${n}" class="${n <= 5 ? "active" : ""}">★</span>`).join("")}
        </div>
        <input type="hidden" id="review-rating" value="5">
        <input type="text" id="review-name" placeholder="اسمك" required>
        <textarea id="review-comment" rows="2" placeholder="رأيك في المنتج (اختياري)"></textarea>
        <button type="submit" class="review-submit-btn">إرسال التقييم</button>
      </form>
    </div>`;

  $("#detail-content").querySelectorAll(".thumb-row img").forEach(t => {
    t.onclick = () => {
      $("#detail-main-img").src = t.dataset.src;
      $("#detail-content").querySelectorAll(".thumb-row img").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
    };
  });

  const relatedRow = $("#detail-content").querySelector(".related-section .mini-products-row");
  if (relatedRow) bindMiniCards(relatedRow);

  trackRecentlyViewed(p.id);
  renderRecentlyViewed();

  let qty = 1;
  const qtyEl = $("#qty-value");
  let selectedColor = null;
  let selectedSize = null;
  let selectedVariant = null;

  function findMatchingVariant() {
    if (!hasVariants) return null;
    return p.variants.find(v =>
      (!variantColors.length || v.color === selectedColor) &&
      (!variantSizes.length || v.size === selectedSize)
    ) || null;
  }

  function updateVariantUI() {
    if (!hasVariants) return;
    selectedVariant = findMatchingVariant();
    const stockEl = $("#detail-stock");
    const addBtn = $("#detail-add-btn");
    const priceEl = $("#detail-price-row .price-now");
    const mainImg = $("#detail-main-img");

    const needsColor = variantColors.length && !selectedColor;
    const needsSize = variantSizes.length && !selectedSize;
    if (needsColor || needsSize) {
      stockEl.textContent = "الرجاء اختيار الخيار المناسب";
      addBtn.disabled = true;
      return;
    }
    if (!selectedVariant) {
      stockEl.textContent = "هذا الخيار غير متوفر";
      addBtn.disabled = true;
      return;
    }
    const vPrice = selectedVariant.priceOverride || p.price;
    if (priceEl) priceEl.textContent = money(vPrice);
    const vOutOfStock = Number(selectedVariant.quantity) <= 0;
    stockEl.innerHTML = vOutOfStock
      ? "غير متوفر حاليًا"
      : (Number(selectedVariant.quantity) <= LOW_STOCK_THRESHOLD
        ? `<span class="low-stock-text">⚡ متبقي ${selectedVariant.quantity} قطع فقط — اطلب الآن</span>`
        : `الكمية المتاحة: ${selectedVariant.quantity}`);
    addBtn.disabled = vOutOfStock;
    if (selectedVariant.image && mainImg) mainImg.src = selectedVariant.image;
    qty = 1;
    qtyEl.textContent = qty;
  }

  if (hasVariants) {
    $$('#color-options .variant-chip').forEach(btn => btn.onclick = () => {
      selectedColor = btn.dataset.color;
      $$('#color-options .variant-chip').forEach(b => b.classList.toggle("active", b === btn));
      updateVariantUI();
    });
    $$('#size-options .variant-chip').forEach(btn => btn.onclick = () => {
      selectedSize = btn.dataset.size;
      $$('#size-options .variant-chip').forEach(b => b.classList.toggle("active", b === btn));
      updateVariantUI();
    });
  }

  $("#qty-minus").onclick = () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; };
  $("#qty-plus").onclick = () => {
    const maxQty = hasVariants ? (Number(selectedVariant?.quantity) || 1) : (Number(p.quantity) || 99);
    qty = Math.min(maxQty, qty + 1);
    qtyEl.textContent = qty;
  };
  const addBtn = $("#detail-add-btn");
  if (addBtn) addBtn.onclick = () => {
    if (hasVariants && !selectedVariant) return;
    const variantPayload = hasVariants ? { id: selectedVariant.id, label: [selectedVariant.color, selectedVariant.size].filter(Boolean).join(" / ") } : null;
    addToCart(p.id, qty, variantPayload);
    closeModal("#detail-modal");
  };

  const wishBtn = $("#detail-wishlist-btn");
  wishBtn.onclick = () => {
    toggleWishlist(p.id);
    wishBtn.classList.toggle("active", wishlist.includes(p.id));
  };

  const shareBtn = $("#detail-share-btn");
  if (shareBtn) shareBtn.onclick = () => shareProduct(p);

  const stockAlertBtn = $("#stock-alert-btn");
  if (stockAlertBtn) stockAlertBtn.onclick = async () => {
    const phone = $("#stock-alert-phone").value.trim();
    if (!phone) return;
    stockAlertBtn.disabled = true;
    stockAlertBtn.textContent = "جاري الإرسال...";
    try {
      await addDoc(collection(db, "stockAlerts"), {
        productId: p.id, productName: p.name || "", phone, notified: false, createdAt: serverTimestamp()
      });
      $("#stock-alert-box").innerHTML = `<p class="stock-alert-success">تم التسجيل، هنبلغك أول ما يتوفر ✔</p>`;
    } catch (err) {
      console.error("خطأ في تسجيل تنبيه التوفر:", err);
      showToast("حدث خطأ، حاول مرة أخرى");
      stockAlertBtn.disabled = false;
      stockAlertBtn.textContent = "نبّهني";
    }
  };

  let selectedRating = 5;
  const starEls = $$("#star-picker span");
  starEls.forEach(s => {
    s.onclick = () => {
      selectedRating = Number(s.dataset.val);
      $("#review-rating").value = selectedRating;
      starEls.forEach(x => x.classList.toggle("active", Number(x.dataset.val) <= selectedRating));
    };
  });

  $("#review-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#review-name").value.trim();
    const comment = $("#review-comment").value.trim();
    const rating = Number($("#review-rating").value) || 5;
    if (!name) return;
    const submitBtn = e.target.querySelector(".review-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الإرسال...";
    try {
      await addDoc(collection(db, "reviews"), {
        productId: p.id, customerName: name, rating, comment, createdAt: serverTimestamp()
      });
      showToast("شكرًا لتقييمك! ⭐");
      openDetailModal(p.id);
      renderProducts();
    } catch (err) {
      console.error("خطأ في إرسال التقييم:", err);
      showToast("حدث خطأ أثناء إرسال التقييم");
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال التقييم";
    }
  });

  openModal("#detail-modal");
}

/* ---------------- Checkout ---------------- */
function computeDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const raw = coupon.type === "fixed" ? coupon.value : subtotal * (coupon.value / 100);
  return Math.min(raw, subtotal);
}

function renderOrderSummary() {
  const summary = $("#order-summary");
  const subtotal = getCartTotal();
  const discount = computeDiscount(appliedCoupon, subtotal);
  const finalTotal = subtotal - discount;

  let html = cart.map(item => {
    const price = getCartItemPrice(item);
    return `<div class="row"><span>${getCartItemName(item)} × ${item.qty}</span><span>${money(price * item.qty)}</span></div>`;
  }).join("");

  html += `<div class="row" style="border-top:1px solid var(--line); margin-top:6px; padding-top:8px;"><span>المجموع الفرعي</span><span>${money(subtotal)}</span></div>`;
  if (appliedCoupon) {
    html += `<div class="row discount-row"><span>خصم (${appliedCoupon.code})</span><span>− ${money(discount)}</span></div>`;
  }
  html += `<div class="row" style="font-weight:800; font-size:16px; border-top:1px solid var(--line); margin-top:6px; padding-top:8px;"><span>الإجمالي</span><span>${money(finalTotal)}</span></div>`;

  summary.innerHTML = html;
}

async function applyCoupon() {
  const input = $("#coupon-code-input");
  const msgEl = $("#coupon-msg");
  const code = input.value.trim().toUpperCase();
  if (!code) return;
  msgEl.innerHTML = `<span class="coupon-error" style="color:var(--text-muted);">جاري التحقق...</span>`;
  try {
    const q = query(collection(db, "coupons"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) { msgEl.innerHTML = `<span class="coupon-error">هذا الكود غير موجود</span>`; return; }
    const c = { id: snap.docs[0].id, ...snap.docs[0].data() };
    if (c.active === false) { msgEl.innerHTML = `<span class="coupon-error">هذا الكود غير مفعّل حاليًا</span>`; return; }
    if (c.expiryDate && new Date(c.expiryDate) < new Date(new Date().toDateString())) {
      msgEl.innerHTML = `<span class="coupon-error">انتهت صلاحية هذا الكود</span>`; return;
    }
    if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) {
      msgEl.innerHTML = `<span class="coupon-error">تم استهلاك هذا الكود بالكامل</span>`; return;
    }
    const subtotal = getCartTotal();
    if (c.minOrder && subtotal < c.minOrder) {
      msgEl.innerHTML = `<span class="coupon-error">الحد الأدنى للطلب لاستخدام هذا الكود هو ${money(c.minOrder)}</span>`; return;
    }
    appliedCoupon = c;
    msgEl.innerHTML = `<span class="coupon-success">تم تطبيق الكوبون بنجاح ✔</span>`;
    renderOrderSummary();
  } catch (e) {
    console.error("خطأ في التحقق من الكوبون:", e);
    msgEl.innerHTML = `<span class="coupon-error">حدث خطأ أثناء التحقق، حاول مرة أخرى</span>`;
  }
}

function openCheckout() {
  if (!cart.length) { showToast("السلة فارغة"); return; }
  appliedCoupon = null;
  $("#coupon-code-input").value = "";
  $("#coupon-msg").innerHTML = "";
  if (CUSTOMER_PROFILE) {
    $("#cust-name").value = CUSTOMER_PROFILE.name || "";
    $("#cust-phone").value = CUSTOMER_PROFILE.phone || "";
  }
  renderOrderSummary();
  $("#checkout-msg").innerHTML = "";
  $("#submit-order-btn").style.display = "";
  closeModal("#detail-modal");
  closeDrawer();
  openModal("#checkout-modal");
}

async function submitOrder(e) {
  e.preventDefault();
  const btn = $("#submit-order-btn");
  const name = $("#cust-name").value.trim();
  const phone = $("#cust-phone").value.trim();
  const address = $("#cust-address").value.trim();
  if (!name || !phone || !address) return;

  btn.disabled = true;
  btn.textContent = "جاري إرسال الطلب...";

  try {
    const items = cart.map(item => {
      const p = getCartItemProduct(item);
      return {
        productId: item.id,
        name: p?.name || "",
        price: getCartItemPrice(item),
        qty: item.qty,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null
      };
    });
    const subtotal = getCartTotal();
    const discountAmount = computeDiscount(appliedCoupon, subtotal);
    const total = subtotal - discountAmount;

    const orderData = {
      customerName: name,
      phone,
      address,
      items,
      subtotal,
      total,
      status: "جديد",
      customerUid: auth.currentUser?.uid || null,
      createdAt: serverTimestamp()
    };
    if (appliedCoupon) {
      orderData.couponCode = appliedCoupon.code;
      orderData.discountAmount = discountAmount;
    }

    const orderRef = await addDoc(collection(db, "orders"), orderData);

    await upsertCustomer(name, phone, total);
    await Promise.all(items.map(item =>
      updateDoc(doc(db, "products", item.productId), { soldCount: increment(item.qty) }).catch(() => {})
    ));
    if (appliedCoupon) {
      await updateDoc(doc(db, "coupons", appliedCoupon.id), { usedCount: increment(1) }).catch(() => {});
    }

    let waConfirmBtn = "";
    if (SETTINGS.whatsapp) {
      const itemsLine = items.map(i => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.qty}`).join("\n");
      const waText = `مرحبًا، عايز أأكد طلبي من ${SETTINGS.storeName || "المتجر"}:\nرقم الطلب: #${orderRef.id.slice(0, 6)}\n${itemsLine}\nالإجمالي: ${money(total)}`;
      const waLink = `https://wa.me/${toIntlWhatsApp(SETTINGS.whatsapp)}?text=${encodeURIComponent(waText)}`;
      waConfirmBtn = `<a href="${waLink}" target="_blank" rel="noopener noreferrer" class="track-success-cta" style="margin-inline-start:8px;">أكّد طلبك عبر واتساب</a>`;
    }

    $("#checkout-msg").innerHTML = `
      <div class="form-msg success">تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.</div>
      <button type="button" class="track-success-cta" id="goto-track-btn">تتبع حالة طلبك الآن</button>
      ${waConfirmBtn}`;
    $("#goto-track-btn").onclick = () => { closeModal("#checkout-modal"); goToOrdersPage(phone); };
    cart = [];
    saveCart();
    appliedCoupon = null;
    $("#checkout-form").reset();
    $("#submit-order-btn").style.display = "none";
  } catch (err) {
    console.error("خطأ في إرسال الطلب:", err);
    $("#checkout-msg").innerHTML = `<div class="form-msg error">حدث خطأ أثناء إرسال الطلب، حاول مرة أخرى.</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "تأكيد الطلب";
  }
}

async function upsertCustomer(name, phone, orderTotal) {
  try {
    const q = query(collection(db, "customers"), where("phone", "==", phone));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "customers"), {
        name, phone,
        ordersCount: 1,
        totalPurchases: orderTotal,
        lastOrder: serverTimestamp()
      });
      await updateDoc(doc(db, "settings", "main"), { customerCount: increment(1) }).catch(() => {});
    } else {
      const custDoc = snap.docs[0];
      await updateDoc(doc(db, "customers", custDoc.id), {
        name,
        ordersCount: increment(1),
        totalPurchases: increment(orderTotal),
        lastOrder: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("خطأ في تحديث بيانات العميل:", e);
  }
}

/* ---------------- Cart (with variant support) ---------------- */
function getCartItemProduct(item) {
  return ALL_PRODUCTS.find(x => x.id === item.id);
}
function getCartItemVariant(item) {
  const p = getCartItemProduct(item);
  if (!p || !item.variantId) return null;
  return (p.variants || []).find(v => v.id === item.variantId) || null;
}
function getCartItemPrice(item) {
  const p = getCartItemProduct(item);
  if (!p) return 0;
  const v = getCartItemVariant(item);
  return (v && v.priceOverride) ? v.priceOverride : p.price;
}
function getCartItemImage(item) {
  const p = getCartItemProduct(item);
  const v = getCartItemVariant(item);
  return (v && v.image) ? v.image : (p?.mainImage || "");
}
function getCartItemName(item) {
  const p = getCartItemProduct(item);
  if (!p) return "";
  return p.name + (item.variantLabel ? ` (${item.variantLabel})` : "");
}

function addToCart(productId, qty, variant = null) {
  const p = ALL_PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const cartKey = variant ? `${productId}::${variant.id}` : productId;
  const existing = cart.find(c => c.cartKey === cartKey);
  if (existing) existing.qty += qty;
  else cart.push({ cartKey, id: productId, variantId: variant?.id || null, variantLabel: variant?.label || null, qty });
  saveCart();
  bounceCartIcon();
  if (navigator.vibrate) { try { navigator.vibrate(35); } catch (e) {} }
  showToast("تمت الإضافة إلى السلة ✔");
}

function bounceCartIcon() {
  const btn = $("#open-cart-btn");
  const badge = $("#cart-count");
  if (btn) { btn.classList.remove("bounce"); void btn.offsetWidth; btn.classList.add("bounce"); }
  if (badge) { badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop"); }
}

function renderCartCount() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  $("#cart-count").textContent = total;
}

function renderCartDrawer() {
  const list = $("#cart-items-list");
  if (!cart.length) {
    list.innerHTML = `<div class="cart-empty">سلتك فارغة حاليًا</div>`;
    $("#cart-total").textContent = money(0);
    return;
  }
  let total = 0;
  list.innerHTML = cart.map(item => {
    const p = getCartItemProduct(item);
    if (!p) return "";
    const price = getCartItemPrice(item);
    const lineTotal = price * item.qty;
    total += lineTotal;
    return `
      <div class="cart-item" data-key="${item.cartKey}">
        <img src="${getCartItemImage(item)}">
        <div class="cart-item-info">
          <h4>${getCartItemName(item)}</h4>
          <div class="price-now">${money(price)}</div>
          <div class="cart-item-qty">
            <button data-act="minus">−</button>
            <span>${item.qty}</span>
            <button data-act="plus">+</button>
          </div>
          <div class="cart-remove" data-act="remove">إزالة</div>
        </div>
      </div>`;
  }).join("");
  $("#cart-total").textContent = money(total);

  list.querySelectorAll(".cart-item").forEach(el => {
    const key = el.dataset.key;
    el.querySelector('[data-act="minus"]').onclick = () => changeQty(key, -1);
    el.querySelector('[data-act="plus"]').onclick = () => changeQty(key, 1);
    el.querySelector('[data-act="remove"]').onclick = () => removeFromCart(key);
  });
}

function changeQty(cartKey, delta) {
  const item = cart.find(c => c.cartKey === cartKey);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.cartKey !== cartKey);
  saveCart();
  renderCartDrawer();
}

function removeFromCart(cartKey) {
  cart = cart.filter(c => c.cartKey !== cartKey);
  saveCart();
  renderCartDrawer();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + getCartItemPrice(item) * item.qty, 0);
}

/* ---------------- Wishlist ---------------- */
function toggleWishlist(id) {
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(x => x !== id);
  } else {
    wishlist.push(id);
    showToast("أُضيف إلى المفضلة ❤");
  }
  saveWishlist();
}

function saveWishlist() {
  localStorage.setItem("store_wishlist", JSON.stringify(wishlist));
  renderWishlistCount();
}

function renderWishlistCount() {
  $("#wishlist-count").textContent = wishlist.length;
}

function renderWishlistDrawer() {
  const list = $("#wishlist-items-list");
  if (!wishlist.length) {
    list.innerHTML = `<div class="cart-empty">قائمة المفضلة فارغة حاليًا</div>`;
    return;
  }
  list.innerHTML = wishlist.map(id => {
    const p = ALL_PRODUCTS.find(x => x.id === id);
    if (!p) return "";
    const outOfStock = p.status === "unavailable" || Number(p.quantity) <= 0;
    return `
      <div class="cart-item" data-id="${p.id}">
        <img src="${p.mainImage || ""}">
        <div class="cart-item-info">
          <h4>${p.name || ""}</h4>
          <div class="price-now">${money(p.price)}</div>
          <div class="wishlist-item-actions">
            <button class="wishlist-move-btn" data-act="addcart" ${outOfStock ? "disabled" : ""}>أضف للسلة</button>
            <span class="cart-remove" data-act="remove">إزالة</span>
          </div>
        </div>
      </div>`;
  }).join("");

  list.querySelectorAll(".cart-item").forEach(el => {
    const id = el.dataset.id;
    const addBtn = el.querySelector('[data-act="addcart"]');
    if (addBtn) addBtn.onclick = () => { addToCart(id, 1); };
    el.querySelector('[data-act="remove"]').onclick = () => { toggleWishlist(id); renderWishlistDrawer(); };
  });
}

function openWishlistDrawer() {
  renderWishlistDrawer();
  $("#wishlist-drawer").classList.add("open");
  $("#drawer-backdrop").classList.add("open");
}
function closeWishlistDrawer() {
  $("#wishlist-drawer").classList.remove("open");
  $("#drawer-backdrop").classList.remove("open");
}

function openDrawer() {
  renderCartDrawer();
  $("#cart-drawer").classList.add("open");
  $("#drawer-backdrop").classList.add("open");
}
function closeDrawer() {
  $("#cart-drawer").classList.remove("open");
  $("#drawer-backdrop").classList.remove("open");
}

/* ---------------- Search ---------------- */
function renderCatalog() {
  renderProducts();
}

let searchTimer;
function handleSearch(e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value;
    renderCatalog();
  }, 250);
}

/* ---------------- Event bindings ---------------- */
/* ================================================================
   حساب العميل (تسجيل الدخول / حساب جديد / متابعة تلقائية)
   ================================================================ */
function openAccountModal() {
  $("#account-login-msg").innerHTML = "";
  $("#account-signup-msg").innerHTML = "";
  if (auth.currentUser) {
    $("#account-auth-view").style.display = "none";
    $("#account-profile-view").style.display = "block";
    $("#account-profile-name").textContent = CUSTOMER_PROFILE?.name || auth.currentUser.email || "";
    $("#account-profile-email").textContent = auth.currentUser.email || "";
    $("#account-goto-orders-btn").textContent = "طلباتي";
  } else {
    $("#account-auth-view").style.display = "block";
    $("#account-profile-view").style.display = "none";
    switchAccountTab("login");
  }
  openModal("#account-modal");
}

function switchAccountTab(tab) {
  $$(".account-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  $("#account-login-form").style.display = tab === "login" ? "flex" : "none";
  $("#account-signup-form").style.display = tab === "signup" ? "flex" : "none";
}

async function fetchCustomerProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "customerProfiles", uid));
    CUSTOMER_PROFILE = snap.exists() ? snap.data() : null;
    if (CUSTOMER_PROFILE?.cart && Array.isArray(CUSTOMER_PROFILE.cart) && CUSTOMER_PROFILE.cart.length && !cart.length) {
      cart = CUSTOMER_PROFILE.cart;
      localStorage.setItem("store_cart", JSON.stringify(cart));
      renderCartCount();
      if ($("#cart-drawer").classList.contains("open")) renderCartDrawer();
    }
  } catch (e) {
    console.error("خطأ في تحميل بيانات الحساب:", e);
    CUSTOMER_PROFILE = null;
  }
  updateAccountIcon();
}

function updateAccountIcon() {
  const btn = $("#open-account-btn");
  if (!btn) return;
  if (auth.currentUser) {
    btn.classList.add("logged-in");
    btn.title = CUSTOMER_PROFILE?.name || "حسابي";
  } else {
    btn.classList.remove("logged-in");
    btn.title = "حسابي";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await fetchCustomerProfile(user.uid);
  } else {
    CUSTOMER_PROFILE = null;
    updateAccountIcon();
  }
  if (location.hash === "#/orders") initOrdersPage();
});

/* ---------------- Order tracking ---------------- */
const ORDER_STEPS = ["جديد", "قيد التجهيز", "تم الشحن", "تم التسليم"];

function renderOrderStepper(status) {
  if (status === "ملغي") {
    return `<div class="order-cancelled-banner">تم إلغاء هذا الطلب</div>`;
  }
  const currentIndex = ORDER_STEPS.indexOf(status);
  return `
    <div class="stepper">
      ${ORDER_STEPS.map((label, i) => {
        let cls = "";
        if (i < currentIndex) cls = "done";
        else if (i === currentIndex) cls = "current";
        return `<div class="step ${cls}"><div class="line"></div><div class="dot">${i + 1}</div><div class="label">${label}</div></div>`;
      }).join("")}
    </div>`;
}

async function trackOrdersByPhone(phone) {
  const resultsBox = $("#orders-page-results");
  resultsBox.innerHTML = `<div class="track-empty">جاري البحث...</div>`;
  try {
    const q = query(collection(db, "orders"), where("phone", "==", phone));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderTrackResults(orders);
    localStorage.setItem("store_last_phone", phone);
  } catch (e) {
    console.error("خطأ في البحث عن الطلبات:", e);
    resultsBox.innerHTML = `<div class="track-empty">حدث خطأ أثناء البحث، حاول مرة أخرى</div>`;
  }
}

function renderTrackResults(orders) {
  const resultsBox = $("#orders-page-results");
  if (!orders.length) {
    resultsBox.innerHTML = `<div class="track-empty">لم يتم العثور على أي طلبات بهذا الرقم</div>`;
    return;
  }
  resultsBox.innerHTML = `<div class="track-results-list">` + orders.map(o => {
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("ar-EG") : "-";
    const itemsLine = (o.items || []).map(i => `<div>${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.qty}</div>`).join("");
    const couponLine = o.couponCode ? `<div>كوبون "${o.couponCode}" — خصم ${money(o.discountAmount || 0)}</div>` : "";
    const showDelivery = o.estimatedDelivery && !["تم التسليم", "ملغي"].includes(o.status);
    const deliveryLine = showDelivery
      ? `<div class="delivery-estimate">🚚 التسليم المتوقع: ${new Date(o.estimatedDelivery + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}</div>`
      : "";
    return `
      <div class="order-track-card">
        <div class="order-track-head">
          <strong>طلب #${o.id.slice(0, 6)}</strong>
          <span class="order-track-date">${date}</span>
          <span class="order-track-total">${money(o.total)}</span>
        </div>
        ${renderOrderStepper(o.status)}
        ${deliveryLine}
        <div class="order-items-summary">${itemsLine}${couponLine}</div>
      </div>`;
  }).join("") + `</div>`;
}

async function trackByCurrentAccount() {
  const resultsBox = $("#orders-page-results");
  resultsBox.innerHTML = `<div class="track-empty">جاري التحميل...</div>`;
  const uid = auth.currentUser.uid;
  try {
    const q = query(collection(db, "orders"), where("customerUid", "==", uid));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderTrackResults(orders);
  } catch (e) {
    console.error("خطأ في تحميل بيانات الحساب:", e);
    resultsBox.innerHTML = `<div class="track-empty">حدث خطأ أثناء التحميل، حاول مرة أخرى</div>`;
  }
}

function initOrdersPage(prefillPhone) {
  if (auth.currentUser) {
    $("#orders-search-form").style.display = "none";
    $("#orders-login-hint").style.display = "none";
    $("#orders-page-results").innerHTML = "";
    trackByCurrentAccount();
    return;
  }
  // مش مسجل دخول — منمنعش ظهور خانة البحث خالص، وبنوري رسالة "سجّل دخول" بس
  $("#orders-search-form").style.display = "none";
  $("#orders-login-hint").style.display = "";
  $("#orders-page-results").innerHTML = "";
}

function goToOrdersPage(prefillPhone) {
  location.hash = "#/orders";
  initOrdersPage(prefillPhone);
}

function handleRoute() {
  const isOrders = location.hash === "#/orders";
  $("#store-view").style.display = isOrders ? "none" : "";
  $("#orders-view").style.display = isOrders ? "" : "none";
  window.scrollTo({ top: 0, behavior: "auto" });
  if (isOrders) initOrdersPage();

  const productMatch = location.hash.match(/^#\/product\/(.+)$/);
  if (productMatch && catalogInitiallyLoaded) {
    const product = ALL_PRODUCTS.find(p => p.id === productMatch[1]);
    if (product) openDetailModal(product.id);
  }
}

function bindAccountEvents() {
  $("#open-account-btn").addEventListener("click", openAccountModal);
  $("#close-account-modal").addEventListener("click", () => closeModal("#account-modal"));
  $("#account-modal").addEventListener("click", (e) => { if (e.target.id === "account-modal") closeModal("#account-modal"); });
  $$(".account-tab").forEach(t => t.addEventListener("click", () => switchAccountTab(t.dataset.tab)));
  $("#orders-page-login-link")?.addEventListener("click", (e) => { e.preventDefault(); openAccountModal(); });

  $("#account-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#account-login-email").value.trim();
    const password = $("#account-login-password").value;
    const msgEl = $("#account-login-msg");
    const btn = $("#account-login-btn");
    msgEl.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "جاري تسجيل الدخول...";
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeModal("#account-modal");
      showToast("تم تسجيل الدخول بنجاح 👋");
    } catch (err) {
      console.error(err);
      msgEl.innerHTML = `<div class="form-msg error">البريد الإلكتروني أو كلمة المرور غير صحيحة</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }
  });

  $("#account-signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#signup-name").value.trim();
    const phone = $("#signup-phone").value.trim();
    const email = $("#signup-email").value.trim();
    const password = $("#signup-password").value;
    const msgEl = $("#account-signup-msg");
    const btn = $("#account-signup-btn");
    msgEl.innerHTML = "";
    btn.disabled = true;
    btn.textContent = "جاري إنشاء الحساب...";
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "customerProfiles", cred.user.uid), { name, phone, email, createdAt: serverTimestamp() });
      CUSTOMER_PROFILE = { name, phone, email };
      closeModal("#account-modal");
      showToast("تم إنشاء حسابك بنجاح 🎉");
    } catch (err) {
      console.error(err);
      let msg = "حدث خطأ أثناء إنشاء الحساب";
      if (err.code === "auth/email-already-in-use") msg = "البريد الإلكتروني مستخدم بالفعل، جرّب تسجيل الدخول";
      else if (err.code === "auth/weak-password") msg = "كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل";
      else if (err.code === "auth/invalid-email") msg = "صيغة البريد الإلكتروني غير صحيحة";
      msgEl.innerHTML = `<div class="form-msg error">${msg}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  });

  $("#account-logout-btn").addEventListener("click", async () => {
    await signOut(auth);
    closeModal("#account-modal");
    showToast("تم تسجيل الخروج");
  });

  $("#account-goto-orders-btn").addEventListener("click", () => {
    closeModal("#account-modal");
    goToOrdersPage();
  });
}

/* ---------------- Button ripple effect ---------------- */
const RIPPLE_SELECTOR = '.cart-btn, .btn-add, .btn-details, .checkout-btn, .submit-order-btn, .detail-add-btn, .hero-content a.btn, .review-submit-btn, .wishlist-move-btn, .quickview-btn, .btn-track-search, .icon-btn, .variant-chip, .cat-pill';

function createRipple(target, x, y) {
  if (target.disabled) return;
  target.classList.add("ripple-host");
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple-el";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = (x - rect.left - size / 2) + "px";
  ripple.style.top = (y - rect.top - size / 2) + "px";
  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function setupRippleEffect() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest(RIPPLE_SELECTOR);
    if (!target) return;
    createRipple(target, e.clientX, e.clientY);
  });
}

function bindEvents() {
  $("#search-input").addEventListener("input", handleSearch);
  $("#open-cart-btn").addEventListener("click", openDrawer);
  $("#close-cart-btn").addEventListener("click", closeDrawer);
  $("#open-wishlist-btn").addEventListener("click", openWishlistDrawer);
  $("#close-wishlist-btn").addEventListener("click", closeWishlistDrawer);
  $("#theme-toggle-btn").addEventListener("click", toggleTheme);
  $("#lang-toggle-btn").addEventListener("click", () => setLanguage(currentLang === "ar" ? "en" : "ar"));
  $("#open-track-btn").addEventListener("click", () => goToOrdersPage());
  $("#back-to-store-link").addEventListener("click", (e) => { e.preventDefault(); location.hash = ""; });
  $("#orders-search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone = $("#orders-phone-input").value.trim();
    if (!phone) return;
    const btn = $("#orders-search-btn");
    btn.disabled = true;
    await trackOrdersByPhone(phone);
    btn.disabled = false;
  });
  window.addEventListener("hashchange", handleRoute);
  $("#drawer-backdrop").addEventListener("click", () => { closeDrawer(); closeWishlistDrawer(); });
  $("#sort-select").addEventListener("change", (e) => { currentSort = e.target.value; renderCatalog(); });
  $("#close-detail-modal").addEventListener("click", () => {
    closeModal("#detail-modal");
    if (/^#\/product\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  });
  $("#detail-modal").addEventListener("click", (e) => { if (e.target.id === "detail-modal") closeModal("#detail-modal"); });
  $("#close-checkout-modal").addEventListener("click", () => closeModal("#checkout-modal"));
  $("#checkout-modal").addEventListener("click", (e) => { if (e.target.id === "checkout-modal") closeModal("#checkout-modal"); });
  $("#go-checkout-btn").addEventListener("click", openCheckout);
  $("#apply-coupon-btn").addEventListener("click", applyCoupon);
  $("#checkout-form").addEventListener("submit", submitOrder);
}

/* ---------------- Scroll reveal ---------------- */
function setupHeaderScrollShadow() {
  const header = document.querySelector("header.site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function setupScrollReveal() {
  const targets = document.querySelectorAll(".section-title, .trust-strip");
  if (!targets.length || !("IntersectionObserver" in window)) return;
  targets.forEach(el => el.classList.add("reveal-on-scroll"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  targets.forEach(el => observer.observe(el));
}

/* ---------------- Init ---------------- */
async function init() {
  try {
    applyTheme(currentTheme);
    bindEvents();
    bindAccountEvents();
    setupRippleEffect();
    applyStaticI18n();
    renderCartCount();
    renderWishlistCount();
    await Promise.all([listenSettings(), listenBanners(), listenCategories(), listenReviews()]);
    await listenProducts();
    renderRecentlyViewed();
    handleRoute();
    setupScrollReveal();
    setupHeaderScrollShadow();
  } finally {
    hidePageLoader();
  }
}

function hidePageLoader() {
  const loader = $("#page-loader");
  if (!loader) return;
  loader.classList.add("hide");
  setTimeout(() => { loader.style.display = "none"; }, 600);
}

init();
