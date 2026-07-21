import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const userGamificationProfileSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    totalXP: {
        type: Number,
        default: 0,
    },
    currentLevel: {
        type: Number,
        default: 1,
    },
    currentStreak: {
        type: Number,
        default: 0,
    },
    longestStreak: {
        type: Number,
        default: 0,
    },
    lastActivityDate: {
        type: Date,
        default: null,
    },
    activeComboMultiplier: {
        type: Number,
        default: 1.0,
    },
    comboExpiryDate: {
        type: Date,
        default: null,
    }
}, { timestamps: true });

userGamificationProfileSchema.methods.calculateLevel = function() {
    const newLevel = Math.floor(Math.sqrt(this.totalXP / 100)) + 1;
    if (newLevel > this.currentLevel) {
        this.currentLevel = newLevel;
    }
};

export default mongoose.model('UserGamificationProfile', userGamificationProfileSchema);