export interface Subcategory {
  id: string;
  name_en: string;
  name_fr: string;
}

export interface Category {
  id: string;
  icon: string;
  name_en: string;
  name_fr: string;
  subcategories: Subcategory[];
}

// Production backend category IDs (UUIDs)
export const CATEGORIES: Category[] = [
  {
    id: '2a98920a-3536-4139-8f50-65c87574fae3',
    icon: '🏠',
    name_en: 'Home & Repairs',
    name_fr: 'Maison & Réparations',
    subcategories: [
      { id: 'furniture_assembly', name_en: 'Furniture Assembly / IKEA Assembly', name_fr: 'Montage de Meubles / IKEA' },
      { id: 'indoor_painting', name_en: 'Indoor Painting & Decoration', name_fr: 'Peinture Intérieure & Décoration' },
      { id: 'general_repairs', name_en: 'General Home Repairs / Handyman', name_fr: 'Réparations Générales / Bricolage' },
      { id: 'light_carpentry', name_en: 'Light Carpentry', name_fr: 'Menuiserie Légère' },
      { id: 'smart_home', name_en: 'Smart Home / TV Mounting & Repairs', name_fr: 'Maison Intelligente / Installation TV' },
      { id: 'help_moving', name_en: 'Help Moving (packing/unpacking)', name_fr: 'Aide au Déménagement (emballage/déballage)' },
      { id: 'heavy_lifting', name_en: 'Heavy Lifting & Loading', name_fr: 'Levage et Chargement Lourds' },
      { id: 'trash_removal', name_en: 'Trash & Furniture Removal', name_fr: 'Enlèvement de Déchets & Meubles' },
      { id: 'yard_work', name_en: 'Yard Work & Snow Removal', name_fr: 'Travaux de Jardin & Déneigement' },
    ],
  },
  {
    id: '435e14b3-71a9-4095-8dea-5a48f03060e2',
    icon: '🧹',
    name_en: 'Cleaning & Organization',
    name_fr: 'Nettoyage & Organisation',
    subcategories: [
      { id: 'cleaning', name_en: 'Cleaning & Spring Cleaning', name_fr: 'Nettoyage & Grand Ménage' },
      { id: 'organization', name_en: 'Organization / Room Measurement', name_fr: 'Organisation / Mesure de Pièce' },
    ],
  },
  {
    id: 'c755612b-aeaa-428a-8f0e-a6d67f03e6b4',
    icon: '📦',
    name_en: 'Errands & Personal Help',
    name_fr: 'Courses & Aide Personnelle',
    subcategories: [
      { id: 'errands', name_en: 'Errands & Personal Assistant', name_fr: 'Courses & Assistant Personnel' },
      { id: 'waiting', name_en: 'Waiting in Line / Event Staffing', name_fr: 'Faire la Queue / Personnel d\'Événement' },
    ],
  },
  {
    id: '9fb97f84-080d-4b43-b8f3-c6ca5a748206',
    icon: '🎨',
    name_en: 'Crafts & Creative',
    name_fr: 'Arts & Créatif',
    subcategories: [
      { id: 'arts_crafts', name_en: 'Arts & Crafts', name_fr: 'Arts & Artisanat' },
      { id: 'photography', name_en: 'Photography', name_fr: 'Photographie' },
    ],
  },
  {
    id: '4c535e64-38c1-47b3-852c-43c78a2dc8f5',
    icon: '🍳',
    name_en: 'Kitchen & Food',
    name_fr: 'Cuisine & Alimentation',
    subcategories: [
      { id: 'cooking', name_en: 'Cooking / Baking', name_fr: 'Cuisine / Pâtisserie' },
    ],
  },
  {
    id: '03736ac6-b18c-4eeb-b8e8-378a9d2b6330',
    icon: '🧺',
    name_en: 'Home Administration',
    name_fr: 'Administration Domestique',
    subcategories: [
      { id: 'laundry', name_en: 'Laundry & Ironing', name_fr: 'Lessive & Repassage' },
      { id: 'data_entry', name_en: 'Data Entry / Office Administration', name_fr: 'Saisie de Données / Administration' },
      { id: 'project_coordination', name_en: 'Project Coordination', name_fr: 'Coordination de Projet' },
    ],
  },
  {
    id: '79a47f61-c295-4aac-9507-63982d95b332',
    icon: '🧵',
    name_en: 'Clothing & Sewing',
    name_fr: 'Vêtements & Couture',
    subcategories: [
      { id: 'sewing', name_en: 'Sewing', name_fr: 'Couture' },
    ],
  },
  {
    id: 'c9cc9751-9ef4-4090-bc63-12db8bd0dff7',
    icon: '💄',
    name_en: 'Beauty & Grooming',
    name_fr: 'Beauté & Soins',
    subcategories: [
      { id: 'beauty_services', name_en: 'Beauty Services', name_fr: 'Services de Beauté' },
      { id: 'hair_styling', name_en: 'Hair Styling & Barber', name_fr: 'Coiffure & Barbier' },
      { id: 'makeup', name_en: 'Make-Up Services', name_fr: 'Services de Maquillage' },
      { id: 'nail_services', name_en: 'Nail Services', name_fr: 'Services d\'Ongles' },
    ],
  },
  {
    id: 'a5b5bc87-7d18-471c-b50b-22c75e587ba8',
    icon: '📚',
    name_en: 'Education & Tutoring',
    name_fr: 'Éducation & Tutorat',
    subcategories: [
      { id: 'education', name_en: 'Education', name_fr: 'Éducation' },
      { id: 'tutoring', name_en: 'Tutoring', name_fr: 'Tutorat' },
    ],
  },
  {
    id: 'a716dfd5-2647-4312-b77c-b716c7c1e763',
    icon: '👶',
    name_en: 'Child Care & Daycare',
    name_fr: 'Garde d\'Enfants',
    subcategories: [
      { id: 'daycare', name_en: 'Daycare / Nanny', name_fr: 'Garderie / Nounou' },
    ],
  },
  {
    id: '657c304d-07c3-45ff-aee1-847f2792ad97',
    icon: '🚗',
    name_en: 'Car Services',
    name_fr: 'Services Automobiles',
    subcategories: [
      { id: 'mechanic', name_en: 'Mechanic / Garagist', name_fr: 'Mécanicien / Garagiste' },
      { id: 'car_cleaning', name_en: 'Car Cleaning & Detailing', name_fr: 'Nettoyage & Détaillage Auto' },
    ],
  },
  {
    id: 'a663cb8d-2e1b-4904-93b8-d2b6302886f2',
    icon: '🚚',
    name_en: 'Delivery Service',
    name_fr: 'Service de Livraison',
    subcategories: [
      { id: 'package_delivery', name_en: 'Package Delivery', name_fr: 'Livraison de Colis' },
      { id: 'food_delivery', name_en: 'Food Delivery', name_fr: 'Livraison de Nourriture' },
      { id: 'grocery_delivery', name_en: 'Grocery Delivery', name_fr: 'Livraison de Courses' },
      { id: 'document_delivery', name_en: 'Document Delivery', name_fr: 'Livraison de Documents' },
      { id: 'express_delivery', name_en: 'Express Delivery', name_fr: 'Livraison Express' },
    ],
  },
  {
    id: '71cc7e2c-66d4-4d35-9ba9-23fd9d0f0ff5',
    icon: '💆',
    name_en: 'Massage & Wellness',
    name_fr: 'Massage & Bien-être',
    subcategories: [
      { id: 'relaxation_massage', name_en: 'Relaxation Massage', name_fr: 'Massage de Relaxation' },
      { id: 'deep_tissue', name_en: 'Deep Tissue Massage', name_fr: 'Massage Tissus Profonds' },
      { id: 'sports_massage', name_en: 'Sports Massage', name_fr: 'Massage Sportif' },
      { id: 'aromatherapy', name_en: 'Aromatherapy', name_fr: 'Aromathérapie' },
      { id: 'reflexology', name_en: 'Reflexology', name_fr: 'Réflexologie' },
      { id: 'wellness', name_en: 'Wellness Consultation', name_fr: 'Consultation Bien-être' },
    ],
  },
];

// Legacy ID mapping for backward compatibility with old tasks
const LEGACY_ID_MAP: { [key: string]: string } = {
  'home_repairs': '2a98920a-3536-4139-8f50-65c87574fae3',
  'cleaning': '435e14b3-71a9-4095-8dea-5a48f03060e2',
  'errands': 'c755612b-aeaa-428a-8f0e-a6d67f03e6b4',
  'crafts': '9fb97f84-080d-4b43-b8f3-c6ca5a748206',
  'kitchen': '4c535e64-38c1-47b3-852c-43c78a2dc8f5',
  'home_admin': '03736ac6-b18c-4eeb-b8e8-378a9d2b6330',
  'clothing': '79a47f61-c295-4aac-9507-63982d95b332',
  'beauty': 'c9cc9751-9ef4-4090-bc63-12db8bd0dff7',
  'education': 'a5b5bc87-7d18-471c-b50b-22c75e587ba8',
  'childcare': 'a716dfd5-2647-4312-b77c-b716c7c1e763',
  'car_services': '657c304d-07c3-45ff-aee1-847f2792ad97',
  'delivery': 'a663cb8d-2e1b-4904-93b8-d2b6302886f2',
  'massage': '71cc7e2c-66d4-4d35-9ba9-23fd9d0f0ff5',
  // Also map some legacy IDs from old tasks
  'home-repairs': '2a98920a-3536-4139-8f50-65c87574fae3',
  'test-category': '2a98920a-3536-4139-8f50-65c87574fae3',
};

export const getCategoryById = (id: string): Category | undefined => {
  // First try direct match
  let category = CATEGORIES.find((cat) => cat.id === id);
  
  // If not found, try legacy ID mapping
  if (!category && LEGACY_ID_MAP[id]) {
    category = CATEGORIES.find((cat) => cat.id === LEGACY_ID_MAP[id]);
  }
  
  return category;
};

export const getSubcategoryById = (categoryId: string, subcategoryId: string): Subcategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories.find((sub) => sub.id === subcategoryId);
};

export const getCategoryName = (category: Category, locale: string): string => {
  return locale === 'fr' ? category.name_fr : category.name_en;
};

export const getSubcategoryName = (subcategory: Subcategory, locale: string): string => {
  return locale === 'fr' ? subcategory.name_fr : subcategory.name_en;
};
