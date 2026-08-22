import { Schema, Document, Connection } from 'mongoose'

export interface IPackageServiceLink extends Document {
  packageCode: string
  serviceCode: string
  division: 'digital' | 'print'
  name: string
  description?: string
}

const PackageServiceLinkSchema = new Schema<IPackageServiceLink>({
  packageCode: { type: String, required: true, index: true },
  serviceCode: { type: String, required: true, index: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true })

PackageServiceLinkSchema.index(
  { packageCode: 1, serviceCode: 1, division: 1 },
  { unique: true, name: 'pkg_svc_unique' }
)

export function createPackageServiceModel(conn: Connection) {
  return conn.model<IPackageServiceLink>('PackageService', PackageServiceLinkSchema)
}
