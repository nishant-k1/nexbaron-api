export const nexbaronAccountOwnership = {
  clientOwned: [
    {
      asset: "Domain",
      nexbaronAccess: "DNS / Admin Access",
    },
    {
      asset: "Google Business Profile",
      nexbaronAccess: "Manager",
    },
    {
      asset: "Google Ads",
      nexbaronAccess: "Manager / Agency Access",
    },
    {
      asset: "GA4",
      nexbaronAccess: "Editor / Analyst",
    },
    {
      asset: "Google Search Console",
      nexbaronAccess: "Full Access",
    },
    {
      asset: "Meta Business",
      nexbaronAccess: "Partner Access",
    },
    {
      asset: "WhatsApp Business",
      nexbaronAccess: "Admin / Partner Access",
    },
    {
      asset: "Payment Gateway",
      nexbaronAccess: "Developer / Admin Access",
    },
  ],

  nexbaronOwned: [
    {
      asset: "CI/CD",
      clientAccess: "As Required",
    },
    {
      asset: "Internal AI Coding Tools",
      clientAccess: "None",
    },
    {
      asset: "Nexbaron Monitoring",
      clientAccess: "Reporting / Appropriate Access",
    },
  ],

  flexibleOwnership: [
    {
      asset: "GitHub Repository",
      owner: ["Nexbaron", "Client"],
      nexbaronAccess: "Depends on Engagement",
    },
    {
      asset: "AWS Infrastructure",
      owner: ["Nexbaron", "Client"],
      nexbaronAccess: "Depends on Engagement",
    },
    {
      asset: "Vercel Account",
      owner: ["Nexbaron", "Client"],
      nexbaronAccess: "Depends on Engagement",
    },
  ],
};
