import express from 'express';
import { protect, restrictTo } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import * as vipController from '@/controllers/vip.controller';
import * as vipValidator from '@/validators/vip.validator';

const router = express.Router();

router.use(protect);

router.post(
  '/campus-codes/generate',
  restrictTo('admin', 'moderator'),
  validate(vipValidator.generateCampusCodeSchema),
  vipController.generateCampusCode
);
router.get('/campus-codes', restrictTo('admin', 'moderator'), vipController.listCampusCodes);

router.post('/rooms', restrictTo('admin', 'creator', 'moderator'), validate(vipValidator.createRoomSchema), vipController.createRoom);
router.get('/rooms', vipController.listRooms);
router.get('/rooms/:roomId', vipController.getRoom);
router.patch('/rooms/:roomId', restrictTo('admin', 'creator', 'moderator'), validate(vipValidator.updateRoomSchema), vipController.updateRoom);
router.delete('/rooms/:roomId', restrictTo('admin', 'creator', 'moderator'), vipController.deleteRoom);

router.post('/rooms/:roomId/join', validate(vipValidator.joinRoomSchema), vipController.joinRoom);
router.post('/rooms/:roomId/leave', vipController.leaveRoom);
router.get('/rooms/:roomId/members', vipController.getRoomMembers);
router.post('/rooms/:roomId/kick', restrictTo('admin', 'moderator'), validate(vipValidator.kickMemberSchema), vipController.kickMember);
router.post('/rooms/:roomId/ban', restrictTo('admin', 'moderator'), validate(vipValidator.banMemberSchema), vipController.banMember);

router.post('/rooms/:roomId/posts', validate(vipValidator.createPostSchema), vipController.createPost);
router.get('/rooms/:roomId/posts', vipController.getRoomPosts);
router.delete('/posts/:postId', vipController.deletePost);

router.post('/rooms/:roomId/pay', validate(vipValidator.processPaymentSchema), vipController.processPayment);
router.post('/webhooks/hubtel', vipController.handlePaymentWebhook);
router.get('/rooms/:roomId/revenue', restrictTo('admin', 'creator', 'moderator'), vipController.getRoomRevenue);

export default router;
