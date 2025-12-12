import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '../../../libs/mongodb';
import Prize from '../../../models/prize';

export async function GET(request: NextRequest) {
    try {
        await connectMongoDB();

        const prize: any = await Prize.findOne().lean();

        if (!prize) {
            return NextResponse.json({
                success: false,
                message: 'No prize found'
            });
        }

        const now = new Date();
        const resetAt = prize.resetAt ? new Date(prize.resetAt) : null;
        const lastDistributed = prize.lastDistributed ? new Date(prize.lastDistributed) : null;

        let timeRemaining = null;
        let nextDistribution = null;

        if (resetAt) {
            timeRemaining = resetAt.getTime() - now.getTime();
            nextDistribution = resetAt;
        }

        return NextResponse.json({
            success: true,
            currentTime: now.toISOString(),
            prize: {
                currentBet: prize.bet || 0,
                commission: prize.commission || 0,
                totalCommission: prize.totalCommission || 0
            },
            distribution: {
                interval: '72 hours (3 days)',
                nextDistribution: nextDistribution?.toISOString(),
                lastDistributed: lastDistributed?.toISOString(),
                timeRemaining: timeRemaining,
                timeRemainingHuman: timeRemaining ? formatTimeRemaining(timeRemaining) : null
            },
            note: 'Prize хуваарилалт 3 хоног тутамд шөнийн 12 цагт явагддаг'
        });

    } catch (error) {
        console.error('Next distribution error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

function formatTimeRemaining(ms: number): string {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days} хоног ${hours} цаг ${minutes} минут`;
    } else if (hours > 0) {
        return `${hours} цаг ${minutes} минут`;
    } else {
        return `${minutes} минут`;
    }
}