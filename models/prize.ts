import mongoose from 'mongoose';

function getThreeDaysMidnight() {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);
    threeDaysLater.setHours(0, 0, 0, 0); 
    return threeDaysLater;
}

const prizeSchema = new mongoose.Schema({
    bet: {
        type: Number,
        required: true,
        default: 0,
    },
    commission: {
        type: Number,
        default: 0,
    },
    totalCommission: {
        type: Number,
        default: 0,
    },
    resetAt: {
        type: Date,
        default: getThreeDaysMidnight
    },
    lastDistributed: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

prizeSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Prize || mongoose.model('Prize', prizeSchema);