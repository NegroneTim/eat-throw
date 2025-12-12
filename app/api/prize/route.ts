import connectMongoDB from "../../../libs/mongodb";
import Prize from "../../../models/prize";
import { NextResponse } from "next/server";
import { NextRequest } from 'next/server';
import { verifyAuth } from "../../../libs/auth";
import { rateLimit, getClientIP } from "../../../libs/rateLimit";

interface CreatePrizeRequest {
    bet: number
}

interface UpdatePrizeRequest {
    bet: number
}


function getThreeDaysFromNow(): Date {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);
    threeDaysLater.setHours(0, 0, 0, 0);
    return threeDaysLater;
}

function shouldResetPrize(resetAt: Date): boolean {
    return new Date() >= resetAt;
}

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

        let prize = await Prize.findOne();

        if (!prize || shouldResetPrize(prize.resetAt)) {
            if (prize) {
                await Prize.findByIdAndDelete(prize._id);
            }
            const newResetAt = getThreeDaysFromNow();
            prize = await Prize.create({
                bet: 0,
                resetAt: newResetAt
            });

            return NextResponse.json({
                prize: {
                    ...prize.toObject(),
                    expiresAt: newResetAt.toISOString()
                }
            });
        }

        return NextResponse.json({
            prize: {
                ...prize.toObject(),
                expiresAt: prize.resetAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Database error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

        await connectMongoDB();

        let existingPrize = await Prize.findOne();

        if (existingPrize && shouldResetPrize(existingPrize.resetAt)) {
            await Prize.findByIdAndDelete(existingPrize._id);
            existingPrize = null;
        }

        if (!existingPrize) {
            const newResetAt = getThreeDaysFromNow();
            const result = await Prize.create({
                bet: 0,
                resetAt: newResetAt
            });
            return NextResponse.json({
                result: {
                    ...result.toObject(),
                    expiresAt: newResetAt.toISOString()
                }
            }, { status: 201 });
        } else {
            return NextResponse.json({
                result: {
                    ...existingPrize.toObject(),
                    expiresAt: existingPrize.resetAt.toISOString()
                }
            }, { status: 200 });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('POST Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
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

        const { bet }: UpdatePrizeRequest = await request.json();

        if (bet === undefined) {
            return NextResponse.json({ error: "Bet field is required" }, { status: 400 });
        }

        await connectMongoDB();

        let prize = await Prize.findOne();

        if (!prize || shouldResetPrize(prize.resetAt)) {
            if (prize) {
                await Prize.findByIdAndDelete(prize._id);
            }
            const newResetAt = getThreeDaysFromNow();
            prize = await Prize.create({
                bet: bet,
                resetAt: newResetAt
            });
        } else {
            prize = await Prize.findByIdAndUpdate(
                prize._id,
                { bet: bet },
                { new: true }
            );
        }

        return NextResponse.json({
            result: {
                ...prize.toObject(),
                expiresAt: prize.resetAt.toISOString()
            }
        }, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}