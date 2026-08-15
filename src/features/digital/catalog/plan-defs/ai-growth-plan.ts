import type { Plan } from '../service-items-pricing-catalog'
import { pickServices } from '../service-items-pricing-catalog'

export const aiGrowthPlan: Plan = {
  id: 'ai-growth',
  name: 'AI Growth',
  tagline: 'AI runs your reviews, chat, content, and leads on autopilot.',
  icon: 'Bot',
  timeline: 'AI live in 5–7 days',
  services: pickServices(['ai-chatbot', 'ai-lead-qualifier', 'ai-content', 'ai-review-manager']),
  addOns: pickServices(['ai-product-photos']),
  ctaLabel: 'Get AI Growth',
  minimumMonths: 3,
  expectations: [
    { label: 'Standalone plan', note: 'Priced on its own — does not include Launch/Growth/Scale services.' },
    { label: 'AI usage billed at cost', note: 'OpenAI / WATI credits are pass-through at our cost.' },
    { label: 'Monthly caretaker review', note: 'Prompts tuned + report shared each month.' },
  ],
}