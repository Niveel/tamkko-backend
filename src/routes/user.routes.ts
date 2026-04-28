import express from 'express';
import { protect } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import * as userController from '@/controllers/user.controller';
import * as userValidator from '@/validators/user.validator';

const router = express.Router();

router.use(protect);
router.get('/me/followers', validate(userValidator.getMyFollowersSchema), userController.getMyFollowers);
router.get('/me/following', validate(userValidator.getMyFollowingSchema), userController.getMyFollowing);
router.get('/me/subscribers', validate(userValidator.getMySubscribersSchema), userController.getMySubscribers);

export default router;
