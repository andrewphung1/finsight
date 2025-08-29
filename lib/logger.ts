// Structured logging system for the financial platform
// Follows the logging plan: namespaces, levels, performance-first, minimal checkpoints

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'

interface LogConfig {
  level: LogLevel
  enableDebug: boolean
}

class Logger {
  private config: LogConfig = {
    level: 'info',
    enableDebug: false
  }

  constructor() {
    this.initializeConfig()
  }

  private initializeConfig() {
    // Environment-based configuration
    const envLevel = process.env.LOG_LEVEL as LogLevel
    if (envLevel && ['error', 'warn', 'info', 'debug', 'trace'].includes(envLevel)) {
      this.config.level = envLevel
    }

    // Runtime debug toggle via URL
    if (typeof window !== 'undefined') {
      this.config.enableDebug = window.location.search.includes('?debug')
      if (this.config.enableDebug && this.config.level === 'info') {
        this.config.level = 'debug'
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    }
    return levels[level] <= levels[this.config.level]
  }

  private formatMessage(namespace: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0] // HH:MM:SS
    let formatted = `${timestamp} ${namespace}: ${message}`
    
    if (data && typeof data === 'object') {
      // Format object data compactly
      const entries = Object.entries(data)
        .map(([key, value]) => {
          if (typeof value === 'number') {
            return `${key}=${value}`
          } else if (typeof value === 'boolean') {
            return `${key}=${value}`
          } else if (typeof value === 'string') {
            return `${key}="${value}"`
          } else if (Array.isArray(value)) {
            return `${key}=[${value.length}]`
          } else if (value === null || value === undefined) {
            return `${key}=null`
          } else {
            return `${key}=${JSON.stringify(value)}`
          }
        })
        .join(' ')
      
      if (entries) {
        formatted += ` ${entries}`
      }
    }
    
    return formatted
  }

  private log(level: LogLevel, namespace: string, message: string, data?: any) {
    if (!this.shouldLog(level)) return

    const formatted = this.formatMessage(namespace, message, data)
    
    switch (level) {
      case 'error':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'debug':
        console.debug(formatted)
        break
      case 'trace':
        console.trace(formatted)
        break
    }
  }

  // Public API
  error(namespace: string, message: string, data?: any) {
    this.log('error', namespace, message, data)
  }

  warn(namespace: string, message: string, data?: any) {
    this.log('warn', namespace, message, data)
  }

  info(namespace: string, message: string, data?: any) {
    this.log('info', namespace, message, data)
  }

  debug(namespace: string, message: string, data?: any) {
    this.log('debug', namespace, message, data)
  }

  trace(namespace: string, message: string, data?: any) {
    this.log('trace', namespace, message, data)
  }

  // Timing utilities
  time<T>(namespace: string, operation: string, fn: () => T): T {
    const start = performance.now()
    try {
      const result = fn()
      const duration = Math.round(performance.now() - start)
      this.info(namespace, operation, { took: duration })
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - start)
      this.error(namespace, 'error', { 
        kind: 'operation-failed', 
        operation, 
        took: duration,
        msg: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  async timeAsync<T>(namespace: string, operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = Math.round(performance.now() - start)
      this.info(namespace, operation, { took: duration })
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - start)
      this.error(namespace, 'error', { 
        kind: 'operation-failed', 
        operation, 
        took: duration,
        msg: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  // Utility for sampling arrays/objects
  sampleArray<T>(arr: T[], maxSamples: number = 3): { count: number, samples: T[] } {
    if (!Array.isArray(arr)) {
      return { count: 0, samples: [] }
    }
    
    const count = arr.length
    if (count === 0) {
      return { count: 0, samples: [] }
    }
    
    const samples = count <= maxSamples 
      ? arr 
      : [arr[0], ...(count > 2 ? [arr[Math.floor(count / 2)]] : []), arr[count - 1]]
    
    return { count, samples }
  }

  // Utility for formatting currency values (privacy guard)
  formatCurrency(amount: number): string {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`
    } else {
      return `$${Math.round(amount)}`
    }
  }

  // Utility for formatting percentages
  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience functions for common namespaces
export const loggers = {
  IMP: (message: string, data?: any) => logger.info('IMP', message, data),
  SES: (message: string, data?: any) => logger.info('SES', message, data),
  LDS: (message: string, data?: any) => logger.info('LDS', message, data),
  DASH: (message: string, data?: any) => logger.info('DASH', message, data),
  PPCH: (message: string, data?: any) => logger.info('PPCH', message, data),
  HPCH: (message: string, data?: any) => logger.info('HPCH', message, data),
  ALOC: (message: string, data?: any) => logger.info('ALOC', message, data),
  HERO: (message: string, data?: any) => logger.info('HERO', message, data),
  EQE: (message: string, data?: any) => logger.info('EQE', message, data),
}

// Error taxonomy
export const ErrorKinds = {
  MISSING_SESSION: 'missing-session',
  BAD_SESSION_SHAPE: 'bad-session-shape',
  NO_EQUITY_SERIES: 'no-equity-series',
  PRICE_FETCH_FAILED: 'price-fetch-failed',
  BASIS_MISSING: 'basis-missing',
  CALC_MISMATCH: 'calc-mismatch',
  RENDER_GUARD_HIT: 'render-guard-hit',
  OPERATION_FAILED: 'operation-failed',
} as const

export type ErrorKind = typeof ErrorKinds[keyof typeof ErrorKinds]

