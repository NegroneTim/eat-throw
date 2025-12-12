import connectMongoDB from "../../../../../libs/mongodb";
import User from "../../../../../models/user";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { rateLimit, getClientIP } from "../../../../../libs/rateLimit";
import { createToken } from "../../../../../libs/auth";

interface UserParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: UserParams }
): Promise<NextResponse> {
  try {
    const clientIP = getClientIP(request);
    try {
      rateLimit(clientIP, 30);
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = params;

    await connectMongoDB();
    const user = await User.findOne({ uid: id }).select('-__v');

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const authHeader = request.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {

      token = await createToken(user);
    }

    return NextResponse.json({
      user,
      ...(token && { token })
    }, { status: 200 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: UserParams }
): Promise<NextResponse> {
  try {

    const { verifyAuth } = await import("../../../../../libs/auth");
    const auth = await verifyAuth(request);
    if (!auth.isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientIP = getClientIP(request);
    try {
      rateLimit(clientIP, 10);
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = params;


    if (auth.user.uid !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();

    const { userUpdateSchema } = await import("../../../../../libs/validation");
    const validationResult: any = userUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { dailyScore, zoos, ard, stats } = body;

    await connectMongoDB();

    const updateData: any = {};
    if (dailyScore !== undefined) updateData.dailyScore = dailyScore;
    if (zoos !== undefined) updateData.zoos = zoos;
    if (ard !== undefined) updateData.ard = ard;
    if (stats !== undefined) updateData.stats = stats;


    const result = await User.findOneAndUpdate(
      { uid: id },
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newToken = await createToken(result);

    return NextResponse.json({
      result,
      token: newToken
    }, { status: 200 });
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}