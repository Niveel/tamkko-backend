import { Router } from 'express';
import { auth } from '@middleware/auth';
import { validate } from '@middleware/validate';
import { applyAmbassadorValidator, getLeaderboardValidator } from '@validators/referral.validator';
import * as referralController from '@controllers/referral.controller';

const router = Router();

router.get('/my-code', auth(), referralController.getMyReferralCode);
router.get('/validate/:referral_code', referralController.validateReferralCode);
router.get('/network', auth(), referralController.getReferralNetwork);
router.get('/earnings', auth(), referralController.getReferralEarnings);
router.get('/leaderboard/top-referrers', validate(getLeaderboardValidator), referralController.getLeaderboard);
router.get('/leaderboard/my-position', auth(), referralController.getMyLeaderboardPosition);
router.post('/ambassador/apply', auth(), validate(applyAmbassadorValidator), referralController.applyForAmbassador);
router.get('/ambassador/status', auth(), referralController.getAmbassadorStatus);

export default router;
