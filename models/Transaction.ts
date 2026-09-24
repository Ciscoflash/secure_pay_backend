import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type TransactionType = 'credit' | 'debit';

/** Wallet ledger entry. Every balance change writes one of these. */
export interface ITransaction extends Document {
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  shipment?: Types.ObjectId;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    // Kobo.
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    shipment: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

transactionSchema.index({ user: 1, createdAt: -1 });

export const TransactionModel = mongoose.model<
  ITransaction,
  Model<ITransaction>
>('Transaction', transactionSchema);

export default TransactionModel;
