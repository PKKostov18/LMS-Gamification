import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const gamificationEventLogSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true,
    },
    actionType: {
        type: String,
        required: true,
    },
    xpAwarded: {
        type: Number,
        required: true,
    },
    multiplierApplied: {
        type: Number,
        default: 1.0,
    },
    relatedEntityId: {
        type: ObjectId,
        default: null,
    }
}, { timestamps: true });

export default mongoose.model('GamificationEventLog', gamificationEventLogSchema);