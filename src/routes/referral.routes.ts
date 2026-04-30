import { Router } from 'express';
import { auth } from '@middleware/auth';
import { validate } from '@middleware/validate';
import {
  applyAmbassadorValidator,
  getLeaderboardValidator,
  adminListAmbassadorApplicationsValidator,
  adminReviewAmbassadorApplicationValidator,
} from '@validators/referral.validator';
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
router.get(
  '/admin/ambassador/applications',
  auth(['admin', 'moderator']),
  validate(adminListAmbassadorApplicationsValidator, 'query'),
  referralController.adminListAmbassadorApplications
);
router.patch(
  '/admin/ambassador/applications/:application_id',
  auth(['admin', 'moderator']),
  validate(adminReviewAmbassadorApplicationValidator),
  referralController.adminReviewAmbassadorApplication
);

export default router;
