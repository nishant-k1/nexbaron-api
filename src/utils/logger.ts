import pino from 'pino'

const isServerless = !!process.env.VERCEL
const isPretty = !isServerless && process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isPretty ? 'debug' : 'info'),
  base: { service: 'nexbaron-api' },
  ...(isPretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }
    : {}),
})
