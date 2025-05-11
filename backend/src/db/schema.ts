import mongoose, { model, Schema, Document } from "mongoose";

export interface IUrl extends Document {
  url: string;
  title: string;
  notes: string;
  category: string;
}

export interface IUser extends Document {
  username: string;
  sharedUrls: mongoose.Types.ObjectId[];
}

export interface IGroup extends Document {
  slug: string;
  members: mongoose.Types.ObjectId[];
  sharedUrls: mongoose.Types.ObjectId[];
}

const urlSchema = new Schema<IUrl>(
  {
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    notes: {
      type: String,
    },
    category: {
      type: String,
    }
  },
  { timestamps: true }
);

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      index: true
    },
    sharedUrls: [{
      type: Schema.Types.ObjectId,
      ref: "Url",
    }],
  },
  { timestamps: true }
);

const groupSchema = new Schema<IGroup>(
  {
    slug: {
      type: String,
      required: true,
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    sharedUrls: [{
      type: Schema.Types.ObjectId,
      ref: "Url",
    }],
  },
  { timestamps: true }
);

export const Group = model<IGroup>("Group", groupSchema);
export const User = model<IUser>("User", userSchema);
export const Url = model<IUrl>("Url", urlSchema);