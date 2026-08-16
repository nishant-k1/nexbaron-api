import { getDivisionModels } from '../../../models/registry'

export async function listRecurring(division: 'digital' | 'print', options: { status?: string; type?: string }) {
  const { RecurringService } = getDivisionModels(division)
  const filter: Record<string, unknown> = { division }
  if (options.status) filter.status = options.status
  if (options.type) filter.type = options.type
  return RecurringService.find(filter).sort({ nextDueDate: 1 }).limit(200).lean()
}

export async function createRecurring(division: 'digital' | 'print', body: Record<string, any>) {
  const { RecurringService } = getDivisionModels(division)
  return RecurringService.create({
    division,
    projectId: body.projectId || '',
    orderId: body.orderId,
    type: body.type || 'maintenance',
    description: String(body.description).trim(),
    frequency: body.frequency || 'monthly',
    amount: Number(body.amount),
    currency: body.currency || 'INR',
    status: body.status || 'active',
    startDate: body.startDate || new Date(),
    nextDueDate: body.nextDueDate || new Date(),
    nextPaymentDate: body.nextPaymentDate || new Date(),
    tasks: body.tasks || [],
    notes: body.notes?.trim() || undefined,
  })
}

export async function updateRecurring(division: 'digital' | 'print', id: string, body: Record<string, any>) {
  const { RecurringService } = getDivisionModels(division)
  const service = await RecurringService.findById(id)
  if (!service || service.division !== division) return null

  if (body.status) service.status = body.status
  if (body.nextDueDate) service.nextDueDate = new Date(body.nextDueDate)
  if (body.nextPaymentDate) service.nextPaymentDate = new Date(body.nextPaymentDate)
  if (body.amount !== undefined) service.amount = Number(body.amount)
  if (body.description) service.description = String(body.description).trim()
  if (body.notes !== undefined) service.notes = body.notes?.trim() || undefined

  if (Array.isArray(body.tasks)) {
    service.tasks = body.tasks.map((t: any) => ({
      description: String(t.description || ''),
      dueDate: new Date(t.dueDate || Date.now()),
      done: Boolean(t.done),
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    }))
    service.markModified('tasks')
  }

  await service.save()
  return service
}
