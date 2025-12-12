import connectMongoDB from "../../../libs/mongodb";
import User from "../../../models/user";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { verifyAuth } from "../../../libs/auth";
import { rateLimit, getClientIP } from "../../../libs/rateLimit";
import { userCreateSchema, userUpdateSchema } from "../../../libs/validation";
import { SignJWT } from "jose";

interface CreateUserRequest {
  user: string;
}

interface UpdateUserRequest {
  dailyScore?: string;
  zoos?: number;
  ard?: number;
  stats?: {
    hp: number;
    earning: number;
    maxCapacity: number;
  };
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const clientIP = getClientIP(request);
    try {
      rateLimit(clientIP, 5);
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const validationResult: any = userCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { user } = validationResult.data;
    await connectMongoDB();

    const existingUsers = await User.find({ user: user.toUpperCase() });

    const result = await User.create({
      user: user.toUpperCase(),
      unicode: existingUsers.length + 1,
      dailyScore: "0",
      zoos: 0,
      ard: 100,
      stats: {
        hp: 1,
        earning: 1,
        maxCapacity: 1
      }
    });

    const userPayload = {
      _id: result._id.toString(),
      user: result.user,
      uid: result.uid,
      unicode: result.unicode,
      dailyScore: result.dailyScore,
      zoos: result.zoos,
      ard: result.ard,
      stats: result.stats
    };

    const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET);
    const token = await new SignJWT({ user: userPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({
      result: userPayload,
      token
    }, { status: 201 });

  } catch (error) {
    console.error('POST Error details:', error);

    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }

    return NextResponse.json({
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientIP = getClientIP(request);
    try {
      rateLimit(clientIP, 10);
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();

    const validationResult: any = userUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { dailyScore, zoos, ard, stats } = validationResult.data;

    await connectMongoDB();

    const updateData: any = {};
    if (dailyScore !== undefined) updateData.dailyScore = dailyScore;
    if (zoos !== undefined) updateData.zoos = zoos;
    if (ard !== undefined) updateData.ard = ard;
    if (stats !== undefined) updateData.stats = stats;

    const result = await User.updateMany(updateData, { new: true });

    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

