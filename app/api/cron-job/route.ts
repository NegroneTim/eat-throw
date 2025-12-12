import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '../../../libs/mongodb';
import Prize from '../../../models/prize';
import User from '../../../models/user';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const TOP_DISTRIBUTION = [
    0.5 / 0.9,
    0.2 / 0.9,
    0.1 / 0.9,
    0.05 / 0.9,
    0.05 / 0.9
];

const COMMISSION_PERCENTAGE = 0.1;

function isMidnight(): boolean {
    const now = new Date();
    return now.getHours() === 0 && now.getMinutes() < 5;
}

export async function GET(request: NextRequest) {
    try {

        const url = new URL(request.url);
        const secret = url.searchParams.get('secret');
        const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';

        if (process.env.NODE_ENV !== 'development' && secret !== cronSecret) {
            console.error('Invalid cron secret');
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid secret key'
            }, { status: 401 });
        }


        if (process.env.NODE_ENV === 'production' && !isMidnight()) {
            return NextResponse.json({
                success: false,
                message: 'Cron job runs only at midnight (00:00)',
                currentTime: new Date().toISOString(),
                shouldRunAt: '00:00 every 3 days'
            });
        }

        const startTime = Date.now();

        await connectMongoDB();
        let prize = await Prize.findOne();

        if (!prize) {
            const resetAt = getThreeDaysMidnight();
            prize = await Prize.create({
                bet: 0,
                commission: 0,
                totalCommission: 0,
                resetAt
            });
            return NextResponse.json({
                success: false,
                message: 'No prize found, created new one',
                prizeBet: 0
            });
        }


        const now = new Date();
        const lastDistributed = prize.lastDistributed ? new Date(prize.lastDistributed) : null;

        if (lastDistributed) {
            const timeDiff = now.getTime() - lastDistributed.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff < 72) {
                return NextResponse.json({
                    success: false,
                    message: `Distribution was done ${Math.floor(hoursDiff)} hours ago`,
                    nextDistribution: prize.resetAt,
                    hoursRemaining: Math.ceil(72 - hoursDiff)
                });
            }
        }

        const totalBet = prize.bet;

        if (totalBet > 0) {
            const commissionAmount = Math.floor(totalBet * COMMISSION_PERCENTAGE);
            const distributableBet = totalBet - commissionAmount;

            const topUsers = await User.find({
                dailyScore: { $gt: 0 }
            })
                .sort({ dailyScore: -1 })
                .limit(5)
                .select('_id user dailyScore ard stats.coin stats.hp stats.earning stats.maxCapacity')
                .lean();

            if (topUsers.length === 0) {
                const newCommission = (prize.commission || 0) + commissionAmount;
                const newTotalCommission = (prize.totalCommission || 0) + commissionAmount;

                await Prize.updateOne(
                    { _id: prize._id },
                    {
                        $set: {
                            bet: 0,
                            commission: newCommission,
                            totalCommission: newTotalCommission,
                            lastDistributed: now,
                            resetAt: getThreeDaysMidnight()
                        }
                    }
                );


                const resetResult = await User.updateMany(
                    { dailyScore: { $gt: 1 } },
                    {
                        $set: {
                            dailyScore: 1,
                            'stats.hp': 1,
                            'stats.earning': 1,
                            'stats.maxCapacity': 1
                        }
                    }
                );

                return NextResponse.json({
                    success: true,
                    message: 'No top users found, 10% added to commission',
                    summary: {
                        totalBet: totalBet,
                        commissionAdded: commissionAmount,
                        newCommission: newCommission,
                        newTotalCommission: newTotalCommission,
                        distributed: 0,
                        usersReset: resetResult.modifiedCount
                    },
                    timestamp: new Date().toISOString()
                });
            }

            const distributionResults = [];
            let totalDistributed = 0;

            const getOriginalPercentage = (index: number): number => {
                const originalPercentages = [0.5, 0.2, 0.1, 0.05, 0.05];
                return index < originalPercentages.length ? originalPercentages[index] : 0;
            };

            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                const percentage = TOP_DISTRIBUTION[i];
                const share = Math.floor(distributableBet * percentage);

                if (share > 0) {
                    distributionResults.push({
                        rank: i + 1,
                        username: user.user,
                        share: share,
                        percentage: percentage * 100,
                        originalPercentage: getOriginalPercentage(i) * 100,
                        previousArd: user.ard || 0,
                        previousCoin: user.stats?.coin || 0
                    });

                    totalDistributed += share;
                }
            }
            distributionResults.forEach(dist => {
                const originalPct = getOriginalPercentage(dist.rank - 1) * 100;
            });

            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    for (let i = 0; i < topUsers.length; i++) {
                        const user = topUsers[i];
                        const share = Math.floor(distributableBet * TOP_DISTRIBUTION[i]);

                        if (share > 0) {
                            await User.updateOne(
                                { _id: user._id },
                                {
                                    $inc: {
                                        'ard': share,
                                        'stats.coin': share
                                    },
                                    $set: {
                                        dailyScore: 1,
                                        'stats.hp': 1,
                                        'stats.earning': 1,
                                        'stats.maxCapacity': 1
                                    }
                                },
                                { session }
                            );
                        }
                    }


                    const topUserIds = topUsers.map(u => u._id);
                    await User.updateMany(
                        {
                            dailyScore: { $gt: 1 },
                            _id: { $nin: topUserIds }
                        },
                        {
                            $set: {
                                dailyScore: 1,
                                'stats.hp': 1,
                                'stats.earning': 1,
                                'stats.maxCapacity': 1
                            }
                        },
                        { session }
                    );


                    const newCommission = (prize.commission || 0) + commissionAmount;
                    const newTotalCommission = (prize.totalCommission || 0) + commissionAmount;
                    const newResetAt = getThreeDaysMidnight();

                    await Prize.updateOne(
                        { _id: prize._id },
                        {
                            $set: {
                                bet: 0,
                                commission: newCommission,
                                totalCommission: newTotalCommission,
                                lastDistributed: now,
                                resetAt: newResetAt
                            }
                        },
                        { session }
                    );
                });

                await session.endSession();

            } catch (transactionError) {
                await session.endSession();
                console.error('Transaction алдаа:', transactionError);
                throw transactionError;
            }

            const updatedTopUsers = await User.find({
                _id: { $in: topUsers.map(u => u._id) }
            })
                .select('user ard stats.coin')
                .lean();

            const updatedPrize: any = await Prize.findById(prize._id)
                .select('commission totalCommission')
                .lean();


            distributionResults.forEach(dist => {
                const updatedUser = updatedTopUsers.find(u => u.user === dist.username);
                if (updatedUser) {
                    dist.newArd = updatedUser.ard || 0;
                    dist.newCoin = updatedUser.stats?.coin || 0;
                }
            });

            const endTime = Date.now();
            const duration = endTime - startTime;
            const newResetAt = getThreeDaysMidnight();

            return NextResponse.json({
                success: true,
                message: '3 хоногийн prize хуваарилалт амжилттай',
                summary: {
                    totalBet: totalBet,
                    commissionAdded: commissionAmount,
                    newCommission: updatedPrize?.commission || 0,
                    newTotalCommission: updatedPrize?.totalCommission || 0,
                    distributable90Percent: distributableBet,
                    totalDistributed: totalDistributed,
                    remaining: distributableBet - totalDistributed,
                    topUsersCount: topUsers.length,
                    durationMs: duration,
                    interval: '72 hours (3 days)',
                    nextDistribution: newResetAt
                },
                note: '10% нь commission-д хадгалагдсан',
                distribution: distributionResults,
                timestamp: now.toISOString(),
                resetAt: newResetAt,
                nextRun: newResetAt.toISOString()
            });

        } else {
            const resetResult = await User.updateMany(
                { dailyScore: { $gt: 1 } },
                {
                    $set: {
                        dailyScore: 1,
                        'stats.hp': 1,
                        'stats.earning': 1,
                        'stats.maxCapacity': 1
                    }
                }
            );

            const newResetAt = getThreeDaysMidnight();

            await Prize.updateOne(
                { _id: prize._id },
                {
                    $set: {
                        resetAt: newResetAt,
                        lastDistributed: now
                    }
                }
            );

            return NextResponse.json({
                success: true,
                message: 'Prize bet is zero, but users have been reset',
                usersReset: resetResult.modifiedCount,
                nextDistribution: newResetAt,
                hoursUntilNext: 72,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('CRON JOB ERROR:', error);

        const errorDetails = {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };

        console.error('Error detail:', errorDetails);

        return NextResponse.json({
            success: false,
            error: 'Cron job failed',
            details: errorDetails,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}


function getThreeDaysMidnight(): Date {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);
    threeDaysLater.setHours(0, 0, 0, 0);
    return threeDaysLater;
}

export async function POST(request: NextRequest) {
    return GET(request);
}