export const getConfig = () => {
  const required = ['NEXT_PUBLIC_JWT_SECRET', 'MONGODB_URI']
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
  
  return {
    jwtSecret: process.env.NEXT_PUBLIC_JWT_SECRET!,
    mongoUri: process.env.MONGODB_URI!,
    nodeEnv: process.env.NODE_ENV || 'development',
  }
}