"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "ar";

const translations = {
  en: {
    nav: {
      brand: "Restaurant",
      home: "Home",
      menu: "Menu",
      admin: "Admin",
      orders: "My Orders",
      cart: "Shopping cart",
      login: "Login",
      logout: "Logout",
      open: "Open now",
      closed: "Closed",
      language: "العربية",
      openMenu: "Open navigation menu",
      closeMenu: "Close navigation menu",
    },
    hero: {
      eyebrow: "Freshly made, every day",
      title: "Delicious food for every moment.",
      description:
        "Explore a menu made with fresh ingredients, generous flavor, and something for every appetite.",
      menuButton: "Explore the menu",
      aboutButton: "Our story",
      imageAlt: "Fresh restaurant meal",
      quality: "Fresh ingredients",
      service: "Made to order",
    },
    about: {
      eyebrow: "Our story",
      title: "Food made with care",
      description:
        "We serve high-quality meals prepared with fresh ingredients and real passion. Our restaurant brings together great taste, a welcoming atmosphere, and a menu with something for everyone.",
      featureOne: "Quality ingredients",
      featureTwo: "Warm hospitality",
      featureThree: "Flavor for everyone",
    },
    contact: {
      eyebrow: "Visit us",
      title: "Contact Us",
      phone: "Phone",
      address: "Address",
      addressValue: "Your restaurant address here",
      hours: "Working Hours",
      hoursValue: "Every day: 9:00 AM - 11:00 PM",
    },
    sidebar: {
      title: "Quick Menu",
      top: "Top",
      menu: "Menu",
      about: "About Us",
      contact: "Contact Us",
      open: "Open quick menu",
      close: "Close quick menu",
    },
    menu: {
      eyebrow: "Made for you",
      title: "Our Menu",
      subtitle: "Find your next favorite meal.",
      browse: "Browse by Food Type",
      searchLabel: "Search foods",
      searchPlaceholder: "Search by food name...",
      category: "Category",
      allCategories: "All categories",
      availability: "Availability",
      allItems: "All items",
      inStock: "In stock",
      outOfStock: "Out of stock",
      sort: "Sort by",
      newest: "Newest",
      priceLow: "Price: low to high",
      priceHigh: "Price: high to low",
      popular: "Most popular",
      noMatches: "No matching foods",
      noMatchesHelp: "Try changing your search or filters.",
      reset: "Reset filters",
      item: "item",
      items: "items",
      other: "Other",
      empty: "No foods found.",
    },
    card: {
      noImage: "No image available",
      customize: "Tap the card to customize ingredients",
      quantity: "Quantity",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      add: "Add to Cart",
      unavailable: "Unavailable",
      addFavorite: "Add to favorites",
      removeFavorite: "Remove from favorites",
    },
    footer: "All rights reserved.",
  },
  ar: {
    nav: {
      brand: "مطعمنا",
      home: "الرئيسية",
      menu: "القائمة",
      admin: "الإدارة",
      orders: "طلباتي",
      cart: "سلة التسوق",
      login: "تسجيل الدخول",
      logout: "تسجيل الخروج",
      open: "مفتوح الآن",
      closed: "مغلق",
      language: "English",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
    },
    hero: {
      eyebrow: "طازج يومياً",
      title: "طعام شهي لكل لحظة.",
      description:
        "اكتشف قائمة محضّرة بمكونات طازجة ونكهات غنية وخيارات تناسب جميع الأذواق.",
      menuButton: "استكشف القائمة",
      aboutButton: "قصتنا",
      imageAlt: "وجبة طازجة من المطعم",
      quality: "مكونات طازجة",
      service: "يُحضّر عند الطلب",
    },
    about: {
      eyebrow: "قصتنا",
      title: "طعام محضّر بعناية",
      description:
        "نقدّم وجبات عالية الجودة محضّرة بمكونات طازجة وشغف حقيقي. يجمع مطعمنا بين المذاق الرائع والأجواء الدافئة وقائمة تناسب الجميع.",
      featureOne: "مكونات عالية الجودة",
      featureTwo: "ضيافة دافئة",
      featureThree: "نكهات تناسب الجميع",
    },
    contact: {
      eyebrow: "تفضل بزيارتنا",
      title: "تواصل معنا",
      phone: "الهاتف",
      address: "العنوان",
      addressValue: "أضف عنوان المطعم هنا",
      hours: "ساعات العمل",
      hoursValue: "يومياً: 9:00 صباحاً - 11:00 مساءً",
    },
    sidebar: {
      title: "روابط سريعة",
      top: "الأعلى",
      menu: "القائمة",
      about: "من نحن",
      contact: "تواصل معنا",
      open: "فتح الروابط السريعة",
      close: "إغلاق الروابط السريعة",
    },
    menu: {
      eyebrow: "محضّر من أجلك",
      title: "قائمتنا",
      subtitle: "اكتشف وجبتك المفضلة التالية.",
      browse: "تصفّح حسب نوع الطعام",
      searchLabel: "ابحث عن وجبة",
      searchPlaceholder: "ابحث باسم الوجبة...",
      category: "الفئة",
      allCategories: "كل الفئات",
      availability: "التوفر",
      allItems: "كل الأصناف",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      sort: "الترتيب",
      newest: "الأحدث",
      priceLow: "السعر: من الأقل إلى الأعلى",
      priceHigh: "السعر: من الأعلى إلى الأقل",
      popular: "الأكثر طلباً",
      noMatches: "لا توجد نتائج مطابقة",
      noMatchesHelp: "جرّب تغيير البحث أو خيارات التصفية.",
      reset: "إعادة ضبط التصفية",
      item: "صنف",
      items: "أصناف",
      other: "أخرى",
      empty: "لا توجد وجبات حالياً.",
    },
    card: {
      noImage: "لا توجد صورة",
      customize: "اضغط على البطاقة لتخصيص المكونات",
      quantity: "الكمية",
      inStock: "متوفر",
      outOfStock: "غير متوفر",
      add: "أضف إلى السلة",
      unavailable: "غير متوفر",
      addFavorite: "أضف إلى المفضلة",
      removeFavorite: "إزالة من المفضلة",
    },
    footer: "جميع الحقوق محفوظة.",
  },
} as const;

type LanguageContextValue = {
  language: Language;
  copy: (typeof translations)[Language];
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("restaurantLanguage");
    if (savedLanguage === "ar" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      copy: translations[language],
      toggleLanguage: () => {
        setLanguage((current) => {
          const nextLanguage = current === "en" ? "ar" : "en";
          localStorage.setItem("restaurantLanguage", nextLanguage);
          return nextLanguage;
        });
      },
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
