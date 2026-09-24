import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export const SHIPMENT_STATUSES = [
  'pending',
  'in_transit',
  'delayed',
  'delivered',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Export = leaving Nigeria, import = arriving in Nigeria, local = domestic. */
export const SHIPMENT_DIRECTIONS = ['export', 'import', 'local'] as const;
export type ShipmentDirection = (typeof SHIPMENT_DIRECTIONS)[number];

export interface IPlace {
  name: string;
  countryCode: string;
}

export interface IShipment extends Document {
  _id: Types.ObjectId;
  trackingId: string;
  user: Types.ObjectId;
  sender: string;
  receiver: string;
  pickUp: IPlace;
  deliveryTo: IPlace;
  amount: number;
  status: ShipmentStatus;
  direction: ShipmentDirection;
  processingHours: number;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const placeSchema = new Schema<IPlace>(
  {
    name: { type: String, required: true, trim: true },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{2}$/, 'Country code must be ISO 3166-1 alpha-2'],
    },
  },
  { _id: false },
);

const shipmentSchema = new Schema<IShipment>(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: { type: String, required: true, trim: true },
    receiver: { type: String, required: true, trim: true },
    pickUp: { type: placeSchema, required: true },
    deliveryTo: { type: placeSchema, required: true },
    // Kobo, like User.walletBalance.
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be a whole number of kobo',
      },
    },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: 'pending',
    },
    direction: {
      type: String,
      enum: SHIPMENT_DIRECTIONS,
      required: true,
    },
    processingHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

// Dashboard queries always filter by owner and a createdAt window.
shipmentSchema.index({ user: 1, createdAt: -1 });

export const ShipmentModel = mongoose.model<IShipment, Model<IShipment>>(
  'Shipment',
  shipmentSchema,
);

export default ShipmentModel;
