import { LRUCache } from 'lru-cache'
import { NextRequest } from 'next/server'

interface RateLimitOptions {
    interval: number
    uniqueTokenPerInterval: number
}

const rateLimitCache = new LRUCache({
    max: 1000,
    ttl: 60000, 
})

export function rateLimit(
    identifier: string,
    limit: number = 10,
    options: RateLimitOptions = { interval: 60000, uniqueTokenPerInterval: 500 }
) {
    const token = identifier
    const now = Date.now()
    const windowStart = Math.floor(now / options.interval) * options.interval
    const key = `${token}:${windowStart}`

    const current = rateLimitCache.get(key) as number || 0

    if (current >= limit) {
        throw new Error('Rate limit exceeded')
    }

    rateLimitCache.set(key, current + 1)
    return {
        limit,
        remaining: limit - (current + 1),
        reset: windowStart + options.interval
    }
}

export function getClientIP(request: NextRequest): string {
    return request.ip ||
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        'unknown'
}