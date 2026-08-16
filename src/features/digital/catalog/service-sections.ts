import { nexbaronPublicEngineeringServices } from "./service-areas/engineering";
import { nexbaronPublicDigitalMarketingServices } from "./service-areas/marketing";

export interface PublicServiceSection {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface PublicService {
  id: string;
  label: string;
  description: string;
  icon: string;
  section: string;
  details: string;
  benefits: string[];
  overview: string[];
  howItWorks: string[];
  faqs: { question: string; answer: string }[];
}

type PublicServiceDomain = "engineering" | "digitalMarketing";
type PublicServiceTree = Record<string, Record<string, string>>;
type PublicServiceRef = `${PublicServiceDomain}.${string}.${string}`;

const PUBLIC_SERVICE_SOURCES: Record<PublicServiceDomain, PublicServiceTree> = {
  engineering: nexbaronPublicEngineeringServices,
  digitalMarketing: nexbaronPublicDigitalMarketingServices,
};

const NEED_SECTIONS: (PublicServiceSection & {
  outcome: string;
  services: PublicServiceRef[];
})[] = [
  {
    id: "build-online-presence",
    slug: "build-online-presence",
    title: "Build My Online Presence",
    subtitle:
      "Websites, ecommerce stores, Google presence, and blog setup to establish a credible online identity.",
    outcome: "build a trusted online presence",
    icon: "Globe",
    services: [
      "engineering.website.businessWebsite",
      "engineering.website.websiteRedesign",
      "engineering.website.websiteMaintenance",
      "engineering.eCommerce.ecommerceStore",
      "engineering.eCommerce.shopifyStore",
      "engineering.eCommerce.woocommerceStore",
      "engineering.eCommerce.ecommerceCustomization",
      "engineering.addOnWebPages.blogDevelopment",
      "digitalMarketing.seo.googleBusinessProfileCreation",
      "digitalMarketing.seo.googleBusinessProfileOptimization",
      "digitalMarketing.socialMedia.socialMediaAccountSetup",
      "digitalMarketing.socialMedia.socialMediaAccountProfileManagement",
    ],
  },
  {
    id: "get-more-leads",
    slug: "get-more-leads",
    title: "Get More Leads & Customers",
    subtitle:
      "SEO, paid advertising, analytics, and tracking to turn visibility into enquiries and revenue.",
    outcome: "get more qualified leads and customers",
    icon: "Target",
    services: [
      "digitalMarketing.seo.googleBusinessProfileManagement",
      "digitalMarketing.seo.googleBusinessProfileReviewManagement",
      "digitalMarketing.seo.seoAudit",
      "digitalMarketing.seo.keywordResearch",
      "digitalMarketing.seo.localCitations",
      "digitalMarketing.seo.technicalSeo",
      "digitalMarketing.seo.onPageSeo",
      "digitalMarketing.seo.seoContent",
      "digitalMarketing.seo.seoCompetitorAnalysis",
      "digitalMarketing.seo.schemaMarkup",
      "digitalMarketing.paidAdvertising.googleAdsManagement",
      "digitalMarketing.paidAdvertising.metaAdsManagement",
      "digitalMarketing.marketingAnalytics.googleAnalytics4Setup",
      "digitalMarketing.marketingAnalytics.googleSearchConsoleSetup",
      "digitalMarketing.marketingAnalytics.googleConversionTrackingSetup",
      "digitalMarketing.marketingAnalytics.metaConversionTrackingSetup",
      "digitalMarketing.marketingAnalytics.googleAnalytics4Reporting",
    ],
  },
  {
    id: "stay-visible-online",
    slug: "stay-visible-online",
    title: "Stay Visible Online",
    subtitle:
      "Social media strategy, content creation, engagement, email campaigns, and competitor tracking.",
    outcome: "stay visible and memorable online",
    icon: "Share2",
    services: [
      "digitalMarketing.socialMedia.socialMediaStrategy",
      "digitalMarketing.socialMedia.socialMediaAccountAuditAndOptimization",
      "digitalMarketing.socialMedia.socialMediaPostCreationAndPublishing",
      "digitalMarketing.socialMedia.socialMediaShortsAndReels",
      "digitalMarketing.socialMedia.socialMediaEngagementManagement",
      "digitalMarketing.socialMedia.socialMediaCommentModeration",
      "digitalMarketing.socialMedia.socialMediaCompetitorAnalysis",
      "digitalMarketing.socialMedia.socialMediaTrendMonitoring",
      "digitalMarketing.emailMarketing.emailCampaignManagement",
      "digitalMarketing.seo.blogContent",
    ],
  },
  {
    id: "automate-my-business",
    slug: "automate-my-business",
    title: "Automate My Business",
    subtitle:
      "AI chatbots, online payments, social feeds, and email automation to save time and scale operations.",
    outcome: "save time with automation",
    icon: "Wand2",
    services: [
      "engineering.webFeatures.aiChatbot",
      "engineering.webFeatures.onlinePayments",
      "engineering.webFeatures.socialMediaFeed",
      "digitalMarketing.emailMarketing.emailMarketingAutomation",
    ],
  },
  {
    id: "manage-customers-operations",
    slug: "manage-customers-operations",
    title: "Manage Customers & Operations",
    subtitle:
      "Web applications, dashboards, booking systems, CRM, forms, live chat, and additional pages.",
    outcome: "manage customers and operations better",
    icon: "Monitor",
    services: [
      "engineering.webApplication.bookingSystem",
      "engineering.webApplication.customerPortal",
      "engineering.webApplication.businessDashboard",
      "engineering.webApplication.reportingSystem",
      "engineering.webApplication.businessManagementSystem",
      "engineering.webApplication.crmSystem",
      "engineering.webFeatures.customFormDevelopment",
      "engineering.webFeatures.liveChat",
      "engineering.webFeatures.whatsappChatButton",
      "engineering.addOnWebPages.locationPageDevelopment",
      "engineering.addOnWebPages.faqDevelopment",
      "engineering.addOnWebPages.testimonialPageDevelopment",
      "engineering.addOnWebPages.portfolioPageDevelopment",
      "engineering.addOnWebPages.careersPageDevelopment",
      "engineering.addOnWebPages.additionalPageDevelopment",
    ],
  },
  {
    id: "connect-my-tools",
    slug: "connect-my-tools",
    title: "Connect My Tools",
    subtitle:
      "Email and SMS integrations, accessibility audits, and performance optimization.",
    outcome: "connect tools and ensure site quality",
    icon: "Plug",
    services: [
      "engineering.integrations.emailIntegration",
      "engineering.integrations.smsOtpIntegration",
      "engineering.accessibility.accessibilityAudit",
      "engineering.accessibility.accessibilityRemediation",
      "engineering.performance.performanceAudit",
      "engineering.performance.performanceOptimization",
    ],
  },
];

const ICON_BY_DOMAIN: Record<PublicServiceDomain, string> = {
  engineering: "Code",
  digitalMarketing: "TrendingUp",
};

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function getServiceId(ref: PublicServiceRef): string {
  const [domain, category, service] = ref.split(".");
  return `${toKebabCase(domain)}-${toKebabCase(category)}-${toKebabCase(service)}`;
}

function getServiceLabel(ref: PublicServiceRef): string {
  const [domain, category, service] = ref.split(".") as [
    PublicServiceDomain,
    string,
    string,
  ];
  const label = PUBLIC_SERVICE_SOURCES[domain]?.[category]?.[service];

  if (!label) {
    throw new Error(`Unknown public service reference: ${ref}`);
  }

  return label;
}

function getDomain(ref: PublicServiceRef): PublicServiceDomain {
  return ref.split(".")[0] as PublicServiceDomain;
}

function getAllSourceRefs(): PublicServiceRef[] {
  return Object.entries(PUBLIC_SERVICE_SOURCES).flatMap(
    ([domain, categories]) =>
      Object.entries(categories).flatMap(([category, services]) =>
        Object.keys(services).map(
          (service) => `${domain}.${category}.${service}` as PublicServiceRef,
        ),
      ),
  );
}

function assertEveryPublicServiceIsGrouped() {
  const groupedRefs = new Set(
    NEED_SECTIONS.flatMap((section) => section.services),
  );
  const sourceRefs = getAllSourceRefs();
  const missing = sourceRefs.filter((ref) => !groupedRefs.has(ref));
  const unknown = [...groupedRefs].filter((ref) => !sourceRefs.includes(ref));

  if (missing.length || unknown.length) {
    throw new Error(
      `Public service grouping mismatch. Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}`,
    );
  }
}

assertEveryPublicServiceIsGrouped();

export function getCanonicalPublicServiceSections(): PublicServiceSection[] {
  return NEED_SECTIONS.map(
    ({ services: _services, outcome: _outcome, ...section }) => section,
  );
}

export function getCanonicalPublicServices(): PublicService[] {
  return NEED_SECTIONS.flatMap((section) =>
    section.services.map((ref) => {
      const domain = getDomain(ref);
      const label = getServiceLabel(ref);

      return {
        id: getServiceId(ref),
        label,
        description: `${label} for businesses that want to ${section.outcome}.`,
        icon: ICON_BY_DOMAIN[domain],
        section: section.id,
        details: `${label} planned and delivered around your business requirement, with Nexbaron handling the technical and execution work end to end.`,
        benefits: [],
        overview: [],
        howItWorks: [],
        faqs: [],
      };
    }),
  );
}
