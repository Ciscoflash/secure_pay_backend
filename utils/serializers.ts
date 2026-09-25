import { IUser } from '../models/User';
import { IShipment } from '../models/Shipment';
export const toPublicUser = (user: IUser) => {
  const [first = '', ...rest] = (user.name || '').trim().split(/\s+/);
  return {
    id: user._id,
    name: user.name,
    firstName: user.firstName || first,
    lastName: user.lastName || rest.join(' '),
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    role: user.role,
    walletBalance: user.walletBalance ?? 0,
    walletNumber: user.walletNumber,
    emailVerified: user.emailVerified ?? false,
  };
};
export const toShipmentDTO = (s: IShipment) => ({
  id: s._id,
  trackingId: s.trackingId,
  sender: s.sender,
  receiver: s.receiver,
  pickUp: s.pickUp,
  deliveryTo: s.deliveryTo,
  amount: s.amount,
  status: s.status,
  direction: s.direction,
  processingHours: s.processingHours,
  isPaid: s.isPaid,
  paidAt: s.paidAt,
  createdAt: s.createdAt,
});
