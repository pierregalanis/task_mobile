export interface Subcategory {
  en: string;
  fr: string;
}

export interface Category {
  id: string;
  icon: string;
  name_en: string;
  name_fr: string;
  subcategories: Subcategory[];
}

// Categories are now loaded dynamically from the API
// This file provides helper functions for working with categories

export const getCategoryById = (categories: Category[], id: string): Category | undefined => {
  return categories.find((cat) => cat.id === id);
};

export const getSubcategoryByIndex = (category: Category, index: number): Subcategory | undefined => {
  return category?.subcategories?.[index];
};

export const getCategoryName = (category: Category, locale: string): string => {
  return locale === 'fr' ? category.name_fr : category.name_en;
};

export const getSubcategoryName = (subcategory: Subcategory, locale: string): string => {
  return locale === 'fr' ? subcategory.fr : subcategory.en;
};

// Country configuration
export const COUNTRIES = {
  ivory_coast: {
    name_fr: "Côte d'Ivoire",
    name_en: "Ivory Coast",
    flag: "🇨🇮",
    phonePrefix: "+225",
    defaultCity: "Abidjan",
    latitude: 5.36,
    longitude: -4.00,
  },
  senegal: {
    name_fr: "Sénégal",
    name_en: "Senegal",
    flag: "🇸🇳",
    phonePrefix: "+221",
    defaultCity: "Dakar",
    latitude: 14.7167,
    longitude: -17.4677,
  },
};

export type CountryCode = keyof typeof COUNTRIES;

export const getCountryConfig = (code: CountryCode) => COUNTRIES[code];
