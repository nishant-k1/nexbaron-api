// Simplified service map for a 2-person digital marketing agency.
// Two people: you (web developer + CRM creator) and your wife (digital marketing + support).
// Clients understand these top-level names: Website, CRM, Digital Marketing.
// NO imports — every value is written out as a literal object.
// Regenerate if the catalog changes.

// Major bucket: Website — your core web development service.
const websiteItems = [
  "Domain registration + setup",
  "SSL certificate included",
  "Up to 5-page website design",
  "Mobile-responsive design",
  "Basic contact form",
  "Google Analytics setup",
  "Fast hosting on reliable servers",
  "Email accounts setup (5 addresses)",
  "One-page editing included (first month)",
  "Mobile testing on iPhone + Android",
]

// Major bucket: CRM — your CRM creation service.
const crmItems = [
  "Contact management database",
  "Basic pipeline stages (new → contact → sale)",
  "Chat support message templates",
  "Appointment scheduling basics",
  "Email + SMS contact storage",
  "Quick reply templates (5 common replies)",
  "Lead info capture form",
  "Export contacts as CSV",
  "Basic task reminders",
  "One-page cheat sheet guide",
]

// Major bucket: Digital Marketing — your wife's service line.
const digitalMarketingItems = [
  "Google Business Profile setup + verify",
  "Post offers + updates (weekly)",
  "Review request automation",
  "Social media post design + scheduling",
  "Email newsletter template + send",
  "SMS appointment reminder setup",
  "Basic DND + TRAI compliance",
  "Monthly performance overview",
  "Simple keyword ideas for your business",
  "WhatsApp broadcast template",
]

// Export the map — major bucket → service id → item labels.
export const SERVICE_ITEMS_MAP = {
  Website: {
    website: websiteItems,
  },
  CRM: {
    crm: crmItems,
  },
  "Digital Marketing": {
    digital: digitalMarketingItems,
  },
}