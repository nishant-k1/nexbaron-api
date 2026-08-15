// Major bucket -> category -> service id -> item labels (plain literal data).
// NO imports — every value is written out as a literal object.
//
// Two axes:
//   1. Major bucket (popular industry terminology):
//        Engineering (Web & Software Development)
//        Digital Marketing
//        AI & Automation
//        Support & Training
//   2. Category (plain business language, NOT internal package/section names):
//        Web Development, Software Development, Advertising, Content & Copywriting,
//        Graphic Design, SEO & Local Marketing, AI & Automation, Support & Training
//
// Derived from service-items-pricing-catalog.ts; regenerate if the catalog changes.

export const SERVICE_ITEMS_MAP: Record<string, Record<string, Record<string, string[]>>> = {
  "Engineering (Web & Software Development)": {
    "Web Development": {
      "website": [
        "Domain Registration (setup + ₹800/yr renewal)",
        "Domain Privacy Protection",
        "SSL Certificate",
        "Cloud Hosting",
        "S3 / Asset Storage",
        "CDN Setup (Cloudflare)",
        "DNS Configuration",
        "Git Repository Setup",
        "CI/CD Pipeline",
        "Design — Figma mockups",
        "Development — Next.js build",
        "Content writing (5 pgs)",
        "Image sourcing (10 imgs)",
        "Mobile responsive testing",
        "Cross-browser testing",
        "SEO meta tags + sitemap",
        "GA4 property setup",
        "Google Search Console setup",
        "Lighthouse perf optimization",
        "Security headers hardening",
        "Daily backups",
        "Uptime monitoring",
        "Privacy policy template"
      ],
      "whatsapp": [
        "WhatsApp Business Account",
        "Chat bubble + pre-chat name/phone form",
        "Click-to-chat deep link + offline message",
        "WA API conversation costs",
        "Chat click tracking + analytics",
        "Mobile + desktop testing"
      ],
      "analytics": [
        "GA4 property + data stream",
        "GTM container + triggers",
        "Event tracking setup",
        "Conversion goal setup",
        "Custom Looker Studio dashboard",
        "Search Console + sitemap",
        "UTM parameter standardization"
      ],
      "launch-pages": [
        "Content writing (500 words)",
        "Design layout in Figma",
        "Development + responsive QA",
        "Image sourcing (2 images)",
        "SEO meta tags for page"
      ],
      "launch-domain": [
        "DNS record configuration",
        "Email forwarding setup",
        "Subdomain configuration",
        "SSL auto-renewal verification"
      ],
      "unlimited-updates": [
        "Content update labor",
        "Design tweaks in Figma",
        "Development + deploy",
        "QA + regression testing",
        "Image replacement + optimization"
      ],
      "business-email": [
        "Zoho Mail account setup + domain verification",
        "DNS MX record configuration",
        "SPF + DKIM + DMARC email authentication",
        "Email signature design + setup",
        "Forwarding rules + aliases",
        "IMAP/SMTP guide for mobile + desktop"
      ],
      "ordering-page": [
        "Order form design (items, quantity, note)",
        "Form fields — name, phone, address, special request",
        "WhatsApp submission integration",
        "Order confirmation auto-reply template",
        "Deploy + testing"
      ],
      "appointment-booking": [
        "Booking page design (branded, responsive)",
        "Time slot + availability configuration",
        "Service / treatment selection menu",
        "WhatsApp + email booking confirmation",
        "Google Calendar auto-sync",
        "Admin dashboard walkthrough + guide",
        "Mobile + desktop testing"
      ]
    },
    "Software Development": {
      "custom-software": [
        "Discovery + scope document",
        "Screen designs + clickable mockups",
        "Customer-facing screens & dashboards",
        "Business rules & data processing",
        "Data storage & organization",
        "Staff login & role-based access",
        "Admin panel — manage records, filter, export",
        "Charts, graphs & KPI dashboards",
        "Kanban board — drag & drop pipeline",
        "Search, sort & advanced filters",
        "Email & in-app notifications + reminders",
        "Automated workflows & triggers",
        "Activity log — who did what, when",
        "Import existing data (Excel / CSV)",
        "Customer portal — clients track their status",
        "Integrations — payments, email, SMS, WhatsApp",
        "File uploads — images, PDFs, documents",
        "Live updates — chat, notifications, statuses",
        "Reports & invoices (PDF)",
        "Testing before launch",
        "Deployment — staging + live setup",
        "User guide & admin manual",
        "30-day support after launch",
        "Team training & handover session"
      ],
      "billing-invoicing": [
        "GST invoices — CGST, SGST & IGST breakdown",
        "Customer & item management",
        "Payment tracking — paid, pending, overdue",
        "UPI / payment links on every invoice",
        "Recurring invoices for subscriptions",
        "Invoice email + WhatsApp share",
        "Reports — revenue, outstanding, GST summary"
      ]
    }
  },
  "Digital Marketing": {
    "Advertising": {
      "google-ads-setup": [
        "Google Ads account + conversion tracking",
        "Search Ads — keyword research + text ad copy",
        "Maps / Local Services Ads — listing + geo-setup",
        "Performance Max — image assets + headlines",
        "YouTube Ads — bumper + discovery ad setup",
        "Landing page optimization for ads",
        "Ad extensions — call, location, sitelink",
        "Budget strategy + bid management setup"
      ],
      "meta-ads-setup": [
        "Meta Business Suite + Commerce Manager setup",
        "FB Pixel + CAPI event setup (shared)",
        "Facebook Feed + Stories — image ads + copy",
        "Instagram Feed + Stories + Reels — vertical ads",
        "WhatsApp — WATI/Interakt platform subscription",
        "WhatsApp — Business API message templates",
        "Messenger — click-to-Messenger flow setup",
        "Audience research — custom + lookalike",
        "Campaign structure — prospecting + retargeting",
        "Budget strategy + bid setup"
      ],
      "google-ads-management": [
        "Search Ads — weekly bid + keyword optimization",
        "Maps Ads — geo-performance tuning",
        "Performance Max — asset refresh + optimization",
        "YouTube Ads — video performance review",
        "A/B testing (2 variants/month)",
        "Search term mining + negative keyword adds",
        "Remarketing audience setup + refresh",
        "Performance dashboard (Looker Studio)",
        "Monthly ads performance report"
      ],
      "meta-ads-management": [
        "Facebook — weekly bid + audience optimization",
        "Instagram — creative refresh + Reels ad optimization",
        "WhatsApp — WATI/Interakt platform",
        "WhatsApp — marketing conversation costs (~50/mo)",
        "WhatsApp — template updates + flow optimization",
        "Messenger — auto-reply flow updates",
        "A/B testing (2 variants/month)",
        "Creative refresh (4 new ads/month)",
        "Audience refinement + exclusions",
        "Remarketing campaign management",
        "Advantage+ / dynamic creative optimization",
        "Competitor ad analysis",
        "Monthly performance report"
      ]
    },
    "Content & Copywriting": {
      "social": [
        "Content calendar planning",
        "Copywriting (8 posts)",
        "Graphic design (8 creatives)",
        "Stock imagery (4 imgs/mo)",
        "Hashtag research",
        "Engagement monitoring + replies",
        "Monthly social report"
      ],
      "social-reels": [
        "Content ideation + storyboards",
        "Stock footage (Artgrid/Storyblocks)",
        "Video editing (CapCut Pro)",
        "Trending audio research",
        "Motion graphics + text overlays",
        "Caption writing + hashtag pack",
        "Instagram Stories design (8/mo)",
        "Posting schedule + tracking"
      ],
      "email-marketing-setup": [
        "Platform setup (Brevo/Mailchimp/MailerLite)",
        "Branded newsletter template (HTML)",
        "Subscriber list import + segmentation",
        "Welcome email automation flow",
        "Signup form embed on website",
        "GDPR / opt-in compliance setup",
        "Test send + deliverability check"
      ],
      "email-marketing": [
        "Monthly newsletter campaigns (2–4 sends)",
        "Content + copywriting for campaigns",
        "Template updates + seasonal designs",
        "A/B subject line testing + optimization",
        "List cleaning + inactive subscriber pruning",
        "Re-engagement campaign (quarterly)",
        "Performance analytics report"
      ],
      "sms-marketing": [
        "SMS platform setup (Twilio/Textlocal/Exotel)",
        "DND scrub + TRAI compliance registration",
        "Message templates — appointment, offer, reminder",
        "DLT template registration (India)",
        "Campaign scheduling + automation",
        "Opt-out / STOP handling in templates",
        "SMS sending costs (~500 msgs/month)",
        "Monthly delivery + conversion report"
      ],
      "blog-content": [
        "Topic research + keyword selection",
        "Writing — 600–800 words per post",
        "Featured image sourcing + optimization",
        "On-page SEO — headings, meta, internal links",
        "Publishing + formatting on website",
        "Monthly content performance report"
      ]
    },
    "Graphic Design": {
      "launch-photos": [
        "Stock photo license",
        "Image optimization (WebP/AVIF)",
        "Alt text + SEO metadata"
      ],
      "branding-identity": [
        "Logo design — 3 concepts + 2 revisions",
        "Color palette — primary + secondary + accent",
        "Typography selection — heading + body fonts",
        "Logo variations — light/dark BG + icon-only",
        "Favicon + app icon generation (all sizes)",
        "Social media profile picture versions",
        "Brand guidelines one-pager (PDF)",
        "Source files — AI/SVG/PNG — delivered via drive"
      ],
      "brochure-pdf": [
        "Design — 4 page A4 / digital layout",
        "Content writing — services + about + contact",
        "Stock / client photo sourcing (8 images)",
        "PDF compression for WhatsApp sharing",
        "Mobile + print optimized export"
      ],
      "qr-suite": [
        "QR code generation (mobile-responsive)",
        "Menu landing page design (responsive)",
        "UPI payment link / QR integration",
        "WhatsApp click-to-chat QR link",
        "Printable A4 PDF with all 3 QR codes",
        "Sticker / table stand design (print-ready)"
      ],
      "festive-campaign": [
        "Campaign theme design + branding",
        "Social media posts (5) — Instagram + Facebook",
        "Email blast template + send",
        "SMS broadcast template + send",
        "WhatsApp Business broadcast template",
        "Festive offer / discount creative (2 variants)"
      ],
      "ai-product-photos": [
        "Product photo guidelines — angles, lighting instructions",
        "Midjourney / DALL-E prompt engineering per product",
        "Background generation + product placement (10 photos)",
        "AI generation credits (Midjourney/DALL-E)",
        "Manual edits + color correction + resize",
        "Web + social media optimized delivery"
      ]
    },
    "SEO & Local Marketing": {
      "gbp": [
        "Business verification assistance (method auto-selected by Google)",
        "Business info + hours setup",
        "Category + service area setup",
        "Photo upload + optimization",
        "Q&A section pre-population",
        "Review response templates",
        "Product/menu section setup"
      ],
      "gbp-optimise": [
        "Weekly GBP posts (4/mo) — offers, updates, photos",
        "Photo optimization + categorization",
        "Offer / promotion post design (Canva)",
        "Review generation campaign + reply drafting",
        "Q&A section monitoring + replies",
        "Competitor GBP analysis (top 3)",
        "Google Maps ranking tracker",
        "Local Falcon rank checker",
        "Monthly performance report"
      ],
      "local-seo": [
        "Local keyword research (30 kw)",
        "Citation building (20+ dirs)",
        "NAP consistency audit",
        "Local backlink outreach (5/mo)",
        "Location page schema markup",
        "BrightLocal / Whitespark tool",
        "Monthly ranking report"
      ],
      "reviews": [
        "Review link generator + Google redirect",
        "SMS review requests (Twilio)",
        "WhatsApp + email review request automation",
        "Review monitoring (alerts)",
        "Review showcase on website",
        "Feedback collection + issue escalation",
        "Monthly review performance dashboard"
      ],
      "seo-report": [
        "Google Search Console data pull",
        "Keyword position tracking",
        "Technical SEO crawl (Sitebulb)",
        "Page speed analysis (Lighthouse)",
        "Broken link check",
        "Competitor comparison (top 3)",
        "Actionable recommendations",
        "PDF report generation (branded)"
      ],
      "growth-city": [
        "City landing page (design+dev)",
        "Local citations (15 directories)",
        "City-specific keyword research",
        "GBP location setup",
        "City schema markup",
        "BrightLocal citation tool"
      ],
      "competitor": [
        "Competitor website audit (3)",
        "SEMrush domain comparison",
        "SWOT analysis document",
        "Market positioning recommendations",
        "Gap analysis — services you lack",
        "PDF report with exec summary",
        "SimilarWeb traffic estimation"
      ],
      "scale-multi": [
        "Additional GBP setup",
        "Location landing page",
        "Local citations for new loc",
        "Location schema + geo sitemap",
        "BrightLocal citation tool"
      ]
    }
  },
  "AI & Automation": {
    "AI & Automation": {
      "whatsapp-book": [
        "WATI / Interakt platform",
        "Auto-reply greeting flow",
        "Quick replies menu (5 options)",
        "Away message automation",
        "Labels + chat organization",
        "Catalog setup in WhatsApp",
        "Booking flow setup",
        "API conversation costs"
      ],
      "ai-chatbot": [
        "WATI / Interakt AI bot subscription",
        "FAQ knowledge base setup (50+ Q&A)",
        "Business context + tone prompt engineering",
        "24/7 auto-reply flow — greeting + FAQ + handoff",
        "Fallback to human trigger setup",
        "Monthly conversation review + prompt tuning"
      ],
      "ai-content": [
        "OpenAI API credits + usage (~20K tokens/mo)",
        "Brand voice + style guide prompt setup",
        "Blog post generation + editing (4/month)",
        "Social media caption generation (8/month)",
        "Email newsletter draft generation (2/month)",
        "SEO keyword + meta description generation",
        "Human review + polishing before publish"
      ],
      "ai-review-manager": [
        "OpenAI API credits + usage (~5K tokens/mo)",
        "Review monitoring — Google + Facebook + Justdial",
        "Auto-response prompt engineering (per platform)",
        "Positive review — thank you + upsell reply",
        "Negative review — empathetic + resolution reply",
        "Sentiment analysis + escalation rules",
        "Monthly review sentiment report"
      ],
      "ai-lead-qualifier": [
        "WATI / Interakt bot flow + OpenAI integration",
        "Qualification script — budget, timeline, requirements",
        "Intent detection prompt setup",
        "Lead scoring rules — hot/warm/cold",
        "Hot lead → instant WhatsApp notification to you",
        "Monthly conversion + lead quality report"
      ]
    }
  },
  "Support & Training": {
    "Support & Training": {
      "account-manager": [
        "Slack/WhatsApp priority channel",
        "Monthly 1-hr strategy call",
        "Strategy deck + KPI report (10 slides)",
        "Quarterly business review deck",
        "Notion/Linear task management",
        "4-hr response SLA (biz hrs)",
        "Weekly async update + action items"
      ],
      "scale-priority": [
        "Priority queue in support system",
        "2-hr response SLA (biz hrs)",
        "Emergency hotline routing"
      ],
      "staff-training": [
        "WhatsApp Business reply guide + templates",
        "GBP posting guide (offers, photos, replies)",
        "Basic website CMS walkthrough",
        "SMS / email campaign dashboard overview",
        "Live session delivery (1–2 hrs)",
        "Quick reference cheat sheet (PDF)"
      ]
    }
  }
}
