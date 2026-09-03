export type CustomerPolicy = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const customerPolicies: CustomerPolicy[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "Template describing the personal data used by this ordering application.",
    sections: [
      {
        heading: "Information used by the application",
        paragraphs: [
          "The application can collect account name, email, phone number, delivery address, map/location information, order notes, order history, password-reset records, and technical security or audit information.",
          "This information supports authentication, account recovery, order preparation and fulfillment, customer support, fraud prevention, operational auditing, and legally required business records.",
        ],
      },
      {
        heading: "Access and storage",
        paragraphs: [
          "Account and order information is stored in the restaurant application's database. Authorized restaurant administrators can view the customer and order information required for operations. Hosting, email, monitoring, rate-limit, and file-storage providers may process limited information according to their configured role.",
          "The final list of processors, privacy contact, lawful basis, customer rights process, and retention periods require owner/legal approval.",
        ],
      },
      {
        heading: "Account removal and business history",
        paragraphs: [
          "When an account with business history is removed, direct account identifiers are disabled or anonymized while historical orders, order items, refunds, issue reports, inventory movements, audit records, and order-time customer snapshots can be retained.",
          "The lawful retention period and deletion schedule are REQUIRES OWNER / LEGAL DECISION items.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "Template for the restaurant's customer ordering terms.",
    sections: [
      {
        heading: "Ordering service",
        paragraphs: [
          "The application supports restaurant orders using the fulfillment and cash-payment methods enabled by the restaurant. Online card payment is not implemented.",
          "Menu availability, prices, service areas, opening hours, order acceptance, and fulfillment details must be confirmed by the restaurant owner before launch.",
        ],
      },
      {
        heading: "Required owner decisions",
        paragraphs: [
          "The owner must approve customer eligibility, order acceptance, changes, cancellation timing, unavailable items, delivery and pickup responsibilities, acceptable use, liability language, dispute handling, and applicable law.",
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund & Cancellation Policy",
    summary: "Template reflecting the application's technical cancellation and refund capabilities.",
    sections: [
      {
        heading: "What the system supports",
        paragraphs: [
          "Administrators can cancel and archive active orders, restore stock when required, change payment status, review food issue reports, and approve full or partial refund amounts up to the remaining eligible order balance.",
          "Completed, paid, or refunded orders are retained as business history rather than deleted. A customer food-issue submission is a request for review and is not an automatic refund approval.",
        ],
      },
      {
        heading: "REQUIRES CUSTOMER INPUT",
        paragraphs: [
          "The owner must decide when customers may request cancellation, whether preparing orders can be cancelled, who approves refunds, whether delivery fees are refundable, what evidence is required, how partial food issues are handled, and how cash refunds are delivered.",
        ],
      },
    ],
  },
  {
    slug: "data-retention",
    title: "Data Retention Policy",
    summary: "Template explaining preservation of operational and financial history.",
    sections: [
      {
        heading: "Records retained by design",
        paragraphs: [
          "Historical orders, order items, refunds, food issue reports, inventory movements, audit history, and order-time customer snapshots remain available after account anonymization so the restaurant can preserve operational and financial records.",
          "Password-reset tokens have their own expiry and consumption state. Account data without protected business history can be deleted according to the implemented account-removal rules.",
        ],
      },
      {
        heading: "REQUIRES OWNER / LEGAL DECISION",
        paragraphs: [
          "No retention duration is approved by this template. The owner/legal reviewer must define durations, lawful reasons, backup handling, access restrictions, deletion schedules, legal holds, and customer request procedures without deleting required financial history automatically.",
        ],
      },
    ],
  },
  {
    slug: "allergy",
    title: "Allergy & Food Safety Notice",
    summary: "Customer-facing safety template for menu ingredients and customizations.",
    sections: [
      {
        heading: "Important allergy information",
        paragraphs: [
          "Menu ingredients, optional ingredients, extras, and customization choices are informational and may not identify every allergen or source of cross-contact.",
          "Customers with allergies or dietary safety concerns should contact the restaurant before ordering. The restaurant is responsible for confirming current ingredients, preparation practices, substitutions, and cross-contact risks. The application does not guarantee that any item is allergen-free or medically safe.",
        ],
      },
      {
        heading: "Owner review required",
        paragraphs: [
          "The restaurant owner must review the final wording and ensure menu ingredient/allergen information and staff procedures are accurate before commercial launch.",
        ],
      },
    ],
  },
];

export function getCustomerPolicy(slug: string) {
  return customerPolicies.find((policy) => policy.slug === slug);
}
