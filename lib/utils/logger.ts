// Logger utility for conditional logging based on environment
// Use this instead of direct console.log calls

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args)
    // Could send to error tracking service in production if needed
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}

// For debugging specific features, use conditional flags
export const debugFlags = {
  bookings: isDevelopment && process.env.DEBUG_BOOKINGS === 'true',
  payments: isDevelopment && process.env.DEBUG_PAYMENTS === 'true',
  seats: isDevelopment && process.env.DEBUG_SEATS === 'true',
  auth: isDevelopment && process.env.DEBUG_AUTH === 'true',
}
