import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    criteriaType: {
        type: String,
        enum: [
            'PERFECT_SCORE', 
            'STREAK_7_DAYS', 
            'PROGRAM_COMPLETED', 
            'FEEDBACK_HERO', 
            'LIVE_PARTICIPATION',
            'PIONEER_STATUS'
        ],
        required: true,
    },
    xpBonus: {
        type: Number,
        default: 0,
    }
}, { timestamps: true });

export default mongoose.model('Badge', badgeSchema);