// Pure constants and types — safe to import in both client components and server models.

export const CATEGORIES = ['vegetables', 'fruits', 'dairy', 'grains', 'snacks', 'beverages', 'household', 'personal_care', 'other'] as const;
export const UNITS = ['kg', 'g', 'L', 'ml', 'pack', 'piece', 'dozen', 'bunch'] as const;
export const STORES = ['zepto', 'instamart', 'flipkart_minutes', 'amazon_fresh'] as const;

export type GroceryCategory = string;
export type GroceryUnit = (typeof UNITS)[number];
export type GroceryStore = (typeof STORES)[number];
