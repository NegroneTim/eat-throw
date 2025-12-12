import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '../../../libs/mongodb';
import Prize from '../../../models/prize';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectMongoDB();

        const prize: any = await Prize.findOne().lean();

        if (!prize) {
            return NextResponse.json({
                success: false,
                message: 'No prize found'
            }, { status: 404 });
        }

        const commissionHistory = [
            { date: '2024-01-01', amount: 1500 },
            { date: '2024-01-02', amount: 2300 },
            { date: '2024-01-03', amount: 1800 },
        ];

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            commission: {
                current: prize.commission || 0,
                total: prize.totalCommission || 0,
                percentage: 10,
                lastUpdated: prize.lastDistributed
            },
            prize: {
                currentBet: prize.bet || 0,
                nextDistribution: prize.resetAt ?
                    new Date(prize.resetAt.getTime() - 3 * 24 * 60 * 60 * 1000) : null,
                resetAt: prize.resetAt
            },
            statistics: {
                averageCommissionPerDay: prize.totalCommission ?
                    Math.floor(prize.totalCommission / 30) : 0,
                estimatedMonthly: prize.totalCommission ?
                    Math.floor(prize.totalCommission / 30 * 30) : 0,
                estimatedYearly: prize.totalCommission ?
                    Math.floor(prize.totalCommission / 30 * 365) : 0
            },
            history: commissionHistory,
            note: '10% нь prize хуваарилалт бүрт commission-д нэмэгддэг'
        });

    } catch (error) {
        console.error('Commission API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    try {
        const { amount, purpose } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({
                success: false,
                error: 'Valid amount required'
            }, { status: 400 });
        }

        await connectMongoDB();

        const prize = await Prize.findOne();

        if (!prize) {
            return NextResponse.json({
                success: false,
                error: 'No prize found'
            }, { status: 404 });
        }

        if ((prize.commission || 0) < amount) {
            return NextResponse.json({
                success: false,
                error: 'Insufficient commission balance',
                available: prize.commission || 0,
                requested: amount
            }, { status: 400 });
        }


        const newCommission = (prize.commission || 0) - amount;

        await Prize.updateOne(
            { _id: prize._id },
            {
                $set: { commission: newCommission }
            }
        );


        const commissionSpend = {
            date: new Date(),
            amount: amount,
            purpose: purpose || 'Unknown',
            remaining: newCommission
        };

        return NextResponse.json({
            success: true,
            message: 'Commission spent successfully',
            spend: commissionSpend,
            newBalance: newCommission,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Commission spend error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}