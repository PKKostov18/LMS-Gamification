import UserGamificationProfile from '../models/UserGamificationProfile.js';
import UserBadge from '../models/UserBadge.js';
import Badge from '../models/Badge.js';
import GamificationEventLog from '../models/GamificationEventLog.js';
import CourseInstance from '../models/CourseInstance.js';
import Certificate from '../models/Certificate.js';
import Program from '../models/Program.js';
import Survey from '../models/Survey.js';

export const GamificationService = {

    // Feature 1 & 6: Core Add XP logic with Combo Multipliers
    async addXP(userId, baseAmount, actionType = 'GENERAL_ACTIVITY', entityId = null) {
        let profile = await UserGamificationProfile.findOne({ user: userId });
        if (!profile) profile = new UserGamificationProfile({ user: userId });

        const now = new Date();
        let currentMultiplier = 1.0;

        if (profile.comboExpiryDate && profile.comboExpiryDate > now) {
            currentMultiplier = profile.activeComboMultiplier;
        } else {
            profile.activeComboMultiplier = 1.0;
            profile.comboExpiryDate = null;
        }

        const finalXP = Math.floor(baseAmount * currentMultiplier);
        profile.totalXP += finalXP;
        profile.calculateLevel();
        
        await profile.save();

        await GamificationEventLog.create({
            user: userId,
            actionType,
            xpAwarded: finalXP,
            multiplierApplied: currentMultiplier,
            relatedEntityId: entityId
        });

        return profile;
    },

    // Feature 3: Dynamic Streaks & Pacing
    async logUserActivity(userId) {
        let profile = await UserGamificationProfile.findOne({ user: userId });
        if (!profile) {
            profile = new UserGamificationProfile({ user: userId });
        }

        const now = new Date();
        if (profile.lastActivityDate) {
            const diffInHours = (now - profile.lastActivityDate) / (1000 * 60 * 60);
            
            if (diffInHours > 24 && diffInHours <= 48) {
                profile.currentStreak += 1;
                if (profile.currentStreak > profile.longestStreak) {
                    profile.longestStreak = profile.currentStreak;
                }
                
                if (profile.currentStreak === 7) {
                    await this.awardBadgeByCriteria(userId, 'STREAK_7_DAYS');
                }
            } else if (diffInHours > 48) {
                profile.currentStreak = 1;
            }
        } else {
            profile.currentStreak = 1;
            profile.longestStreak = 1;
        }

        profile.lastActivityDate = now;
        await profile.save();
        return profile;
    },

    // Feature 4: Live vs Self-Paced Quests
    async processCourseAction(userId, courseInstanceId, actionType) {
        const instance = await CourseInstance.findById(courseInstanceId);
        if (!instance) return;

        let baseXP = 10; 

        if (instance.isLive && actionType === 'SLIDO_PARTICIPATION') {
            baseXP += 50; 
            await this.awardBadgeByCriteria(userId, 'LIVE_PARTICIPATION', courseInstanceId);
        } else if (!instance.isLive && actionType === 'FAST_MODULE_COMPLETION') {
            baseXP += 30; 
        }

        await this.addXP(userId, baseXP, actionType, courseInstanceId);
    },

    // Handles logic for Feature 1 (Scaling XP), Feature 2 (Perfect Score), Feature 6 (Combo), Feature 7 (Pioneer)
    async processCertificateEarned(userId, certificateId) {
        const cert = await Certificate.findById(certificateId);
        if (!cert) return;

        const xpEarned = cert.score * 5; 
        await this.addXP(userId, xpEarned, 'CERTIFICATE_EARNED', certificateId);

        if (cert.score === 100) {
            await this.awardBadgeByCriteria(userId, 'PERFECT_SCORE', cert._id);
        }

        await this.activateComboMultiplier(userId);
        await this.checkAndAwardPioneerBonus(userId, cert.courseInstance);
    },

    // Feature 2: Survey Feedback Hero logic
    async processSurveyCompletion(userId, surveyId) {
        const survey = await Survey.findById(surveyId);
        if (!survey) return;

        await this.addXP(userId, 20, 'SURVEY_COMPLETED', surveyId);
        await this.awardBadgeByCriteria(userId, 'FEEDBACK_HERO', surveyId);
    },

    // Feature 6: Program Skill Trees & Combo Multipliers Setup
    async activateComboMultiplier(userId) {
        const profile = await UserGamificationProfile.findOne({ user: userId });
        if (!profile) return;

        profile.activeComboMultiplier = 1.5; 
        
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7); 
        profile.comboExpiryDate = expiry;

        await profile.save();
    },

    // Feature 7: Pioneer Bonus Evaluation
    async checkAndAwardPioneerBonus(userId, courseInstanceId) {
        const completionCount = await Certificate.countDocuments({ courseInstance: courseInstanceId });
        
        const pioneerThreshold = 10;
        if (completionCount <= pioneerThreshold) {
            await this.awardBadgeByCriteria(userId, 'PIONEER_STATUS', courseInstanceId);
            await this.addXP(userId, 500, 'PIONEER_BONUS', courseInstanceId);
        }
    },

    // Feature 2 Core Logic
    async awardBadgeByCriteria(userId, criteriaType, relatedEntityId = null) {
        const badge = await Badge.findOne({ criteriaType });
        if (!badge) return;

        const existing = await UserBadge.findOne({ user: userId, badge: badge._id });
        if (!existing) {
            await UserBadge.create({
                user: userId,
                badge: badge._id,
                relatedEntityId
            });
            if (badge.xpBonus > 0) {
                await this.addXP(userId, badge.xpBonus, 'BADGE_EARNED', badge._id);
            }
        }
    },

    // Feature 5: Leaderboards Global
    async getGlobalLeaderboard(limit = 50) {
        return await UserGamificationProfile.find()
            .sort({ totalXP: -1 })
            .limit(limit)
            .populate('user', 'generalInfo.firstName generalInfo.lastName avatarUrl');
    },

    // Feature 5: Leaderboards Local
    async getCourseLeaderboard(courseInstanceId) {
        const instance = await CourseInstance.findById(courseInstanceId).select('enrolledUsers');
        if (!instance) return [];
        
        return await UserGamificationProfile.find({
            user: { $in: instance.enrolledUsers }
        })
        .sort({ totalXP: -1 })
        .populate('user', 'generalInfo.firstName generalInfo.lastName avatarUrl');
    }
};