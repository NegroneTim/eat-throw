import connectMongoDB from "../../../../libs/mongodb";
import User from "../../../../models/user";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { verifyAuth, createToken } from "../../../../libs/auth";
import { rateLimit, getClientIP } from "../../../../libs/rateLimit";
import { userUpdateSchema } from "../../../../libs/validation";

interface UserParams {
  id: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: UserParams }
): Promise<NextResponse> {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!auth.user) return NextResponse.json({ error: "User data not found in token" }, { status: 401 });

    const { id } = params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    if (auth.user?._id !== id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const validationResult: any = userUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
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

    const result = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!result) {

      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newToken = await createToken(result);

    return NextResponse.json({
      result,
      token: newToken
    }, { status: 200 });

  } catch (error) {
    console.error('18. PUT Error details:', error);
    console.error('19. Error stack:', error.stack);


    return NextResponse.json({
      error: "Internal server error",
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: UserParams }
): Promise<NextResponse> {
  try {

    const auth = await verifyAuth(request);
    if (!auth.isValid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientIP = getClientIP(request);
    try {
      rateLimit(clientIP, 30);
    } catch {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

    await connectMongoDB();
    const user = await User.findOne({ _id: id }).select('-__v');

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}