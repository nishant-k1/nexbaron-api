import { getDivisionModels } from '../../../models/registry'

export async function listTestimonials(division: 'digital' | 'print', options: { approved?: string; tag?: string }) {
  const { Testimonial } = getDivisionModels(division)
  const filter: Record<string, unknown> = { division }
  if (options.approved === 'true') filter.approved = true
  else if (options.approved === 'false') filter.approved = false
  if (options.tag) filter.tags = options.tag
  return Testimonial.find(filter).sort({ createdAt: -1 }).limit(100).lean()
}

export async function createTestimonial(division: 'digital' | 'print', body: Record<string, any>) {
  const { Testimonial } = getDivisionModels(division)
  return Testimonial.create({
    division,
    projectId: body.projectId || '',
    orderId: body.orderId || '',
    quote: String(body.quote).trim().slice(0, 500),
    author: {
      name: String(body.author.name).trim(),
      company: body.author.company?.trim() || undefined,
      role: body.author.role?.trim() || undefined,
    },
    rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    approved: Boolean(body.approved),
    source: body.source || 'direct',
  })
}

export async function updateTestimonial(division: 'digital' | 'print', id: string, body: Record<string, any>) {
  const { Testimonial } = getDivisionModels(division)
  const testimonial = await Testimonial.findById(id)
  if (!testimonial || testimonial.division !== division) return null

  if (body.quote) testimonial.quote = String(body.quote).trim().slice(0, 500)
  if (body.rating !== undefined) testimonial.rating = Math.min(5, Math.max(1, Number(body.rating)))
  if (Array.isArray(body.tags)) testimonial.tags = body.tags.map(String)
  if (typeof body.approved === 'boolean') testimonial.approved = body.approved

  await testimonial.save()
  return testimonial
}

export async function deleteTestimonial(division: 'digital' | 'print', id: string) {
  const { Testimonial } = getDivisionModels(division)
  await Testimonial.deleteOne({ _id: id, division })
}
