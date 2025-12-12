import connectMongoDB from "../../../libs/mongodb";
import User from "../../../models/user";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { rateLimit, getClientIP } from "../../../libs/rateLimit";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const clientIP = getClientIP(request);
        try {
            rateLimit(clientIP, 30);
        } catch {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }
        await connectMongoDB();

        const players = await User.find({})
            .sort({ dailyScore: -1 })
            .limit(10)
            .select('-__v')
            .lean();

        const users = players.map((item) => { return { user: item.user, dailyScore: item.dailyScore, _id: item._id, unicode: item.unicode } })
        return NextResponse.json({ users });
    } catch (error) {
        console.error('Database error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}