import mongoose from 'mongoose'
import { logger } from './logger'

export async function connectDatabase() {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI
    
    if (!mongoUri) {
      throw new Error('DATABASE_URL or MONGODB_URI environment variable is not set')
    }

    await mongoose.connect(mongoUri)
    logger.info('Connected to MongoDB')
  } catch (error) {
    logger.error('MongoDB connection error:', error)
    throw error
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect()
    logger.info('Disconnected from MongoDB')
  } catch (error) {
    logger.error('MongoDB disconnection error:', error)
    throw error
  }
}

