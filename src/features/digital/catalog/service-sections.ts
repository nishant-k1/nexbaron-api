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
      "Websites, landing pages, ecommerce, Google presence, and analytics to look credible online.",
    outcome: "build a trusted online presence",
    icon: "Globe",
    services: [
      "engineering.website.businessWebsite",
      "engineering.website.landingPage",
      "engineering.website.websiteRedesign",
      "engineering.website.websiteMaintenance",
      "engineering.ecommerce.ecommerceStore",
      "engineering.ecommerce.shopifyStore",
      "engineering.ecommerce.woocommerceStore",
      "engineering.ecommerce.ecommerceCustomization",
      "digitalMarketing.seo.googleBusinessProfile",
    ],
  },
  {
    id: "get-more-leads",
    slug: "get-more-leads",
    title: "Get More Leads & Customers",
    subtitle:
      "SEO, ads, local marketing, landing page campaigns, and tracking to turn attention into enquiries.",
    outcome: "get more qualified leads and customers",
    icon: "Target",
    services: [
      "digitalMarketing.seo.onlineReputationManagement",
      "digitalMarketing.seo.seo",
      "digitalMarketing.seo.localSeo",
      "digitalMarketing.seo.technicalSeo",
      "digitalMarketing.seo.onPageSeo",
      "digitalMarketing.seo.seoContent",
      "digitalMarketing.paidAdvertising.googleAds",
      "digitalMarketing.paidAdvertising.metaAds",
      "digitalMarketing.paidAdvertising.remarketing",
      "digitalMarketing.analytics.marketingAnalytics",
      "digitalMarketing.analytics.campaignReporting",
    ],
  },
  {
    id: "stay-visible-online",
    slug: "stay-visible-online",
    title: "Stay Visible Online",
    subtitle:
      "Social media, content marketing, creatives, short videos, blog content, and email marketing.",
    outcome: "stay visible and memorable online",
    icon: "Share2",
    services: [
      "digitalMarketing.socialMedia.socialMediaManagement",
      "digitalMarketing.socialMedia.socialMediaStrategy",
      "digitalMarketing.socialMedia.contentMarketing",
      "digitalMarketing.socialMedia.socialMediaCreatives",
      "digitalMarketing.socialMedia.shortFormVideo",
      "digitalMarketing.seo.blogContent",
      "digitalMarketing.emailMarketing.emailMarketing",
      "digitalMarketing.emailMarketing.emailCampaignManagement",
    ],
  },
  {
    id: "automate-my-business",
    slug: "automate-my-business",
    title: "Automate My Business",
    subtitle:
      "WhatsApp, booking, email, CRM, workflow, document, process, and AI automation to save time.",
    outcome: "save time with automation",
    icon: "Wand2",
    services: [
      "engineering.automation.leadAutomation",
      "engineering.automation.whatsappAutomation",
      "engineering.automation.bookingAutomation",
      "engineering.automation.emailAutomation",
      "engineering.automation.workflowAutomation",
      "engineering.automation.crmAutomation",
      "engineering.automation.businessProcessAutomation",
      "engineering.automation.documentAutomation",
      "engineering.automation.approvalWorkflowAutomation",
      "engineering.ai.aiChatbot",
      "engineering.ai.aiAssistant",
      "engineering.ai.aiAutomation",
      "engineering.ai.aiAgent",
      "digitalMarketing.emailMarketing.emailMarketingAutomation",
    ],
  },
  {
    id: "manage-customers-operations",
    slug: "manage-customers-operations",
    title: "Manage Customers & Operations",
    subtitle:
      "CRMs, portals, dashboards, reporting systems, booking systems, and internal business tools.",
    outcome: "manage customers and operations better",
    icon: "Monitor",
    services: [
      "engineering.webApplication.bookingSystem",
      "engineering.webApplication.customerPortal",
      "engineering.webApplication.businessDashboard",
      "engineering.webApplication.reportingSystem",
      "engineering.webApplication.businessManagementSystem",
      "engineering.webApplication.internalBusinessTool",
      "engineering.webApplication.crmSystem",
      "engineering.analytics.webAnalytics",
      "engineering.analytics.dataVisualization",
      "engineering.analytics.reporting",
      "engineering.analytics.reportingAutomation",
    ],
  },
  {
    id: "connect-my-tools",
    slug: "connect-my-tools",
    title: "Connect My Tools",
    subtitle:
      "Integrations for WhatsApp, email, SMS/OTP, CRM, payments, calendar, accounting, shipping, and APIs.",
    outcome: "connect tools and reduce manual work",
    icon: "Plug",
    services: [
      "engineering.integrations.whatsappIntegration",
      "engineering.integrations.emailIntegration",
      "engineering.integrations.smsOtpIntegration",
      "engineering.integrations.crmIntegration",
      "engineering.integrations.paymentGatewayIntegration",
      "engineering.integrations.ecommerceIntegration",
      "engineering.integrations.calendarIntegration",
      "engineering.integrations.googleWorkspaceIntegration",
      "engineering.integrations.mapsLocationIntegration",
      "engineering.integrations.accountingIntegration",
      "engineering.integrations.shippingIntegration",
      "engineering.integrations.marketingIntegration",
      "engineering.integrations.customApiIntegration",
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
