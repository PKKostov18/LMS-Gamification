import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const userBadgeSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true,
    },
    badge: {
        type: ObjectId,
        ref: 'Badge',
        required: true,
    },
    earnedAt: {
        type: Date,
        default: Date.now,
    },
    relatedEntityId: {
        type: ObjectId,
        default: null, 
    }
});

userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

export default mongoose.model('UserBadge', userBadgeSchema);