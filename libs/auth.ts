import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';


interface PublicRoute {
  path?: string;
  pathPattern?: RegExp;
  methods: string[];
}

const PUBLIC_ROUTES: PublicRoute[] = [
  
  { path: '/api/score', methods: ['GET', 'POST'] },
  { path: '/api/users', methods: ['POST'] }, 
  { pathPattern: /^\/api\/users\/uid\/[A-Z0-9]+$/, methods: ['GET'] }, 
  { path: '/api/prize', methods: ['GET'] }, 
  { pathPattern: /^\/api\/leaderboard/, methods: ['GET'] },
];

export async function verifyAuth(request: NextRequest): Promise<{ isValid: boolean; user?: any; isPublic?: boolean }> {
  try {
    const { pathname, method }: any = request.nextUrl;

    
    const isPublicRoute = PUBLIC_ROUTES.some(route => {
      if (route.path && route.path === pathname && route.methods.includes(method)) {
        return true;
      }
      if (route.pathPattern && route.pathPattern.test(pathname) && route.methods.includes(method)) {
        return true;
      }
      return false;
    });

    
    if (isPublicRoute) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);

          console.log('Public route JWT payload:', payload);

          
          let userData = payload.user || payload;
          userData = extractUserData(userData);

          return {
            isValid: true,
            user: userData,
            isPublic: true
          };
        } catch (error) {
          console.log('Public route with invalid token, allowing access');
        }
      }

      return {
        isValid: true,
        isPublic: true
      };
    }

    
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isValid: false };
    }

    const token = authHeader.split(' ')[1];

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      console.log('Private route JWT payload type:', typeof payload.user);

      
      let userData: any = payload.user;

      if (!userData) {
        
        if (payload._id || payload.uid) {
          userData = payload;
        }
      }

      if (!userData) {
        console.error('No user data found in JWT payload');
        return { isValid: false };
      }

      
      userData = extractUserData(userData);

      if (!userData || !userData._id) {
        console.error('No valid user data found in JWT payload');
        return { isValid: false };
      }

      return {
        isValid: true,
        user: userData
      };
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return { isValid: false };
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return { isValid: false };
  }
}


function extractUserData(userData: any): any {
  if (!userData) return null;

  
  if (userData._doc) {
    
    const docData = userData._doc;
    const extractedData = {
      ...docData,
      _id: docData._id?.toString ? docData._id.toString() : docData._id
    };
    return extractedData;
  }

  
  if (userData._id && typeof userData._id === 'object') {
    userData._id = userData._id.toString ? userData._id.toString() : userData._id;
  }

  return userData;
}

export async function createToken(user: any): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET);

  
  const userForToken = extractUserData(user);

  
  const simplifiedUser = {
    _id: userForToken._id,
    uid: userForToken.uid,
    user: userForToken.user,
    dailyScore: userForToken.dailyScore || 0,
    zoos: userForToken.zoos || 0,
    ard: userForToken.ard || 0,
    stats: userForToken.stats || { hp: 1, earning: 1, maxCapacity: 1 }
  };

  const token = await new SignJWT({ user: simplifiedUser })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .setIssuedAt()
    .sign(secret);

  return token;
}


export function checkPermission(authUser: any, targetUserId?: string): boolean {
  if (!authUser) return false;

  
  if (authUser.role === 'admin') return true;

  
  if (targetUserId && authUser._id === targetUserId) return true;

  return false;
}