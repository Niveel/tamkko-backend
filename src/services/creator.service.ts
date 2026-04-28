import { User } from '@/models/User';
import { ApiError } from '@/utils/apiError';

const DEFAULT_PRICE_GHS = 20;

export const getMySubscriptionPrice = async (creatorId: string) => {
  const user = await User.findOne({ _id: creatorId, isDeleted: false }).select('subscriptionPriceGhs');
  if (!user) throw new ApiError(404, 'User not found');
  return { price_ghs: user.subscriptionPriceGhs ?? DEFAULT_PRICE_GHS };
};

export const updateMySubscriptionPrice = async (creatorId: string, priceGhs: number) => {
  const user = await User.findOneAndUpdate(
    { _id: creatorId, isDeleted: false },
    { subscriptionPriceGhs: priceGhs },
    { new: true }
  ).select('subscriptionPriceGhs');

  if (!user) throw new ApiError(404, 'User not found');
  return { price_ghs: user.subscriptionPriceGhs };
};
