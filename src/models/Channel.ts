import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceLog {
  userId: string;
  userName: string;
  channelId: string;
  durationMs: number;
  timestamp: Date;
}

export interface IChannel extends Document {
  name: string;
  createdAt: Date;
}

const VoiceLogSchema: Schema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
  durationMs: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChannelSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export const VoiceLog: Model<IVoiceLog> = mongoose.models.VoiceLog || mongoose.model<IVoiceLog>('VoiceLog', VoiceLogSchema);
export const Channel: Model<IChannel> = mongoose.models.Channel || mongoose.model<IChannel>('Channel', ChannelSchema);
