import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth';
import { catchAsync } from '@/utils/catchAsync';
import * as vipService from '@/services/vip.service';

const actorId = (req: AuthRequest) => req.user?.id ?? '';

export const generateCampusCode = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.createCampusCode(req.body);
  res.status(201).json({ status: 'success', data });
});

export const listCampusCodes = catchAsync(async (_req: AuthRequest, res: Response) => {
  const data = await vipService.listCampusCodes();
  res.json({ status: 'success', data });
});

export const createRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.createRoom(actorId(req), req.body);
  res.status(201).json({ status: 'success', data });
});

export const listRooms = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.listRooms(req.query, actorId(req));
  res.json({ status: 'success', data });
});

export const listJoinedRooms = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.listJoinedRooms(req.query, actorId(req));
  res.json({ status: 'success', data });
});

export const listMyRooms = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.listMyRooms(req.query, actorId(req));
  res.json({ status: 'success', data });
});

export const getRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.getRoom(req.params.roomId, actorId(req));
  res.json({ status: 'success', data });
});

export const updateRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.updateRoom(req.params.roomId, actorId(req), req.body);
  res.json({ status: 'success', data });
});

export const deleteRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.deleteRoom(req.params.roomId, actorId(req));
  res.json({ status: 'success', data });
});

export const joinRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.joinRoom(req.params.roomId, actorId(req), req.body);
  res.status(201).json({ status: 'success', data });
});

export const previewPromoCode = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.previewPromoCode(req.params.roomId, req.body);
  res.json({ status: 'success', data });
});

export const leaveRoom = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.leaveRoom(req.params.roomId, actorId(req));
  res.json({ status: 'success', data });
});

export const getRoomMembers = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.getRoomMembers(req.params.roomId, req.query);
  res.json({ status: 'success', data });
});

export const kickMember = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { action: 'kick_member_not_configured' } });
});

export const banMember = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { action: 'ban_member_not_configured' } });
});

export const createPost = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.status(201).json({ status: 'success', data: { action: 'vip_post_not_configured' } });
});

export const getRoomPosts = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { items: [] } });
});

export const deletePost = catchAsync(async (_req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { deleted: true } });
});

export const processPayment = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.processPayment(req.params.roomId, actorId(req), req.body);
  res.json({ status: 'success', data });
});

export const listAccessPasses = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.listAccessPasses(req.params.roomId, actorId(req));
  res.json({ status: 'success', data });
});

export const createAccessPass = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.createAccessPass(actorId(req), req.body);
  res.status(201).json({ status: 'success', data });
});

export const updateAccessPass = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.updateAccessPass(actorId(req), req.params.passId, req.body);
  res.json({ status: 'success', data });
});

export const deleteAccessPass = catchAsync(async (req: AuthRequest, res: Response) => {
  await vipService.deleteAccessPass(actorId(req), req.params.passId);
  res.json({ status: 'success', message: 'Access pass deleted.' });
});

export const handlePaymentWebhook = catchAsync(async (req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { received: true, provider: 'hubtel', payload: req.body } });
});

export const getRoomRevenue = catchAsync(async (req: AuthRequest, res: Response) => {
  const data = await vipService.getRoomRevenue(req.params.roomId);
  res.json({ status: 'success', data });
});
