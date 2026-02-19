export interface Subcategory {
  id?: string;
  name_en?: string;
  name_fr?: string;
  en?: string;
  fr?: string;
}

export interface Category {
  id: string;
  icon: string;
  name_en: string;
  name_fr: string;
  subcategories: Subcategory[];
}

// Default empty categories array for fallback
export const CATEGORIES: Category[] = [];

// Get category by ID from a categories array
export const getCategoryById = (categories: Category[], id: string): Category | undefined => {
  if (!categories || !Array.isArray(categories)) return undefined;
  return categories.find((cat) => cat.id === id);
};

// Get subcategory by ID from a category
export const getSubcategoryById = (category: Category | undefined, subcategoryId: string): Subcategory | undefined => {
  if (!category || !category.subcategories || !Array.isArray(category.subcategories)) return undefined;
  return category.subcategories.find((sub) => 
    sub.id === subcategoryId || sub.name_en === subcategoryId || sub.en === subcategoryId
  );
};

// Get subcategory by index (legacy support)
export const getSubcategoryByIndex = (category: Category, index: number): Subcategory | undefined => {
  return category?.subcategories?.[index];
};

// Get category display name
export const getCategoryName = (category: Category | undefined, locale: string): string => {
  if (!category) return '';
  return locale === 'fr' ? (category.name_fr || category.name_en) : (category.name_en || category.name_fr);
};

// Get subcategory display name
export const getSubcategoryName = (subcategory: Subcategory | undefined, locale: string): string => {
  if (!subcategory) return '';
  // Support both new format (name_en/name_fr) and old format (en/fr)
  if (locale === 'fr') {
    return subcategory.name_fr || subcategory.fr || subcategory.name_en || subcategory.en || '';
  }
  return subcategory.name_en || subcategory.en || subcategory.name_fr || subcategory.fr || '';
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