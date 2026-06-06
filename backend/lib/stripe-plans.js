/**
 * SantiPulse Stripe Plans Configuration
 * Use these IDs in your Stripe Dashboard to link payments to packages.
 */

export const STRIPE_PLANS = {
    PACKAGE_1: {
        name: "Recepcionista IA & Hub de Leads",
        price_id: "price_REPLACE_WITH_STRIPE_ID_1", // Subscription ID from Stripe
        features: ["AI Voice", "WhatsApp CRM", "Calendar Sync"]
    },
    PACKAGE_2: {
        name: "Insights de Redes & Auto-Poster",
        price_id: "price_REPLACE_WITH_STRIPE_ID_2",
        features: ["Trend Scraper", "Auto-Posting", "Analytics"]
    },
    PACKAGE_3: {
        name: "Gestor de Ads Automático",
        price_id: "price_REPLACE_WITH_STRIPE_ID_3",
        features: ["Auto-Optimization", "Performance Rules", "ROI Scaling"]
    }
};
