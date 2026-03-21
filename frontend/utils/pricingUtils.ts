/**
 * Pricing utility functions for Soutrali Mobile App
 * 
 * Handles per-service pricing, fallback to global rates, and price formatting.
 * 
 * Pricing Priority:
 * 1. Per-service rate (from tasker_profile.services matching the category)
 * 2. Global tasker rate (tasker_profile.hourly_rate)
 * 3. Return 0 and show "Contact for price"
 */

export interface ServiceItem {
  category: string;
  category_id?: string;
  subcategory: string;
  hourly_rate?: number;
  fixed_price?: number;
  pricing_type?: 'hourly' | 'fixed';
  bio?: string;
  max_travel_distance?: number;
}

export interface TaskerProfile {
  hourly_rate?: number;
  services?: ServiceItem[];
  [key: string]: any;
}

export interface Tasker {
  id: string;
  full_name: string;
  tasker_profile?: TaskerProfile;
  [key: string]: any;
}

export interface Category {
  id: string;
  name_en?: string;
  name_fr?: string;
  name?: string;
  [key: string]: any;
}

/**
 * Get the correct hourly rate for a booking
 * Priority: Per-service rate > Global tasker rate > 0
 */
export const getHourlyRateForBooking = (
  tasker: Tasker | null | undefined,
  categoryId?: string,
  category?: Category | null
): number => {
  if (!tasker) return 0;
  
  const services = tasker?.tasker_profile?.services || [];
  
  for (const service of services) {
    if (typeof service === 'object') {
      const matchesById = service.category_id === categoryId || service.category === categoryId;
      const matchesByName = category && (
        service.category === category.name_en || 
        service.category === category.name_fr ||
        service.category === category.name
      );
      
      if (matchesById || matchesByName) {
        if (service.hourly_rate && service.hourly_rate > 0) {
          return service.hourly_rate;
        }
      }
    }
  }
  
  return tasker?.tasker_profile?.hourly_rate || 0;
};

/**
 * Get the correct rate for a specific service (by subcategory)
 */
export const getServiceRate = (
  tasker: Tasker | null | undefined,
  subcategoryName?: string
): number => {
  if (!tasker) return 0;
  
  const services = tasker?.tasker_profile?.services || [];
  
  for (const service of services) {
    if (typeof service === 'object') {
      const matchesBySubcategory = 
        service.subcategory === subcategoryName ||
        service.subcategory?.toLowerCase() === subcategoryName?.toLowerCase();
      
      if (matchesBySubcategory) {
        if (service.hourly_rate && service.hourly_rate > 0) {
          return service.hourly_rate;
        }
      }
    }
  }
  
  return tasker?.tasker_profile?.hourly_rate || 0;
};

/**
 * Calculate total cost for a booking
 */
export const calculateTotalCost = (hourlyRate: number, durationHours: number): number => {
  return Math.round(hourlyRate * durationHours);
};

/**
 * Format price for display
 */
export const formatPrice = (amount: number | undefined | null, language: string = 'en'): string => {
  if (!amount || amount <= 0) {
    return language === 'fr' ? 'Contactez pour le prix' : 'Contact for price';
  }
  return `${amount.toLocaleString()} CFA`;
};

/**
 * Format hourly rate for display
 */
export const formatHourlyRate = (rate: number | undefined | null, language: string = 'en'): string => {
  if (!rate || rate <= 0) {
    return language === 'fr' ? 'Contactez pour le prix' : 'Contact for price';
  }
  return `${rate.toLocaleString()} CFA/h`;
};

/**
 * Format total cost for display on task cards/lists
 * Shows "Price TBD" instead of "Contact for price" for tasks
 */
export const formatTaskPrice = (amount: number | undefined | null, language: string = 'en'): string => {
  if (!amount || amount <= 0) {
    return language === 'fr' ? 'Prix à définir' : 'Price TBD';
  }
  return `${amount.toLocaleString()} CFA`;
};

/**
 * Get price display info for a service
 */
export const getServicePriceInfo = (
  service: ServiceItem | null | undefined,
  globalRate: number = 0,
  language: string = 'en'
): { rate: number; displayText: string; pricingType: 'hourly' | 'fixed' } => {
  if (!service) {
    return {
      rate: globalRate,
      displayText: globalRate > 0 
        ? `${globalRate.toLocaleString()} CFA/h` 
        : (language === 'fr' ? 'Contactez pour le prix' : 'Contact for price'),
      pricingType: 'hourly',
    };
  }
  
  const pricingType = service.pricing_type || 'hourly';
  
  if (pricingType === 'fixed') {
    const rate = service.fixed_price || 0;
    return {
      rate,
      displayText: rate > 0 
        ? `${rate.toLocaleString()} CFA` 
        : (language === 'fr' ? 'Contactez pour le prix' : 'Contact for price'),
      pricingType: 'fixed',
    };
  }
  
  const rate = service.hourly_rate || globalRate || 0;
  return {
    rate,
    displayText: rate > 0 
      ? `${rate.toLocaleString()} CFA/h` 
      : (language === 'fr' ? 'Contactez pour le prix' : 'Contact for price'),
    pricingType: 'hourly',
  };
};