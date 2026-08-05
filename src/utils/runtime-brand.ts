import 'dotenv/config'

export type Brand = 'digital' | 'print'

const configuredBrand = process.env.BRAND

if (configuredBrand !== 'digital' && configuredBrand !== 'print') {
  throw new Error('BRAND must be set to "digital" or "print"')
}

export const runtimeBrand: Brand = configuredBrand
