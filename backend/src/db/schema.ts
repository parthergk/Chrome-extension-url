import mongoose, { model, Schema, Document } from "mongoose";

export interface IUrl extends Document {
  url: string;
}

export interface IUser extends Document {
  userId: string;
  sharedUrls: mongoose.Types.ObjectId;
}

export interface IGroup extends Document {
  slug: string;
  sharedUrls: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const urlSchema = new Schema<IUrl>(
  {
    url: {
      type: String,
      required: true,
    },
  },
);

export const Url = model<IUrl>("Url", urlSchema);

const userSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    sharedUrls: {
      type: Schema.Types.ObjectId,
      ref: "Url",
      required: true,
    },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);

const groupSchema = new Schema<IGroup>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedUrls: {
      type: Schema.Types.ObjectId,
      ref: "Url",
      required: true,
    },
  },
  { timestamps: true }
);

export const Group = model<IGroup>("Group", groupSchema);
