import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'welcome'
  | 'credit'
  | 'debit'
  | 'shipment'
  | 'info';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [120, 'Title cannot be more than 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please add a message'],
      trim: true,
      maxlength: [500, 'Message cannot be more than 500 characters'],
    },
    type: {
      type: String,
      enum: ['welcome', 'credit', 'debit', 'shipment', 'info'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const NotificationModel = mongoose.model<INotification, Model<INotification>>(
  'Notification',
  notificationSchema,
);

export default NotificationModel;