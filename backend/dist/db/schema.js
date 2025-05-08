"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Url = exports.User = exports.Group = void 0;
const mongoose_1 = require("mongoose");
const urlSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
const userSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sharedUrls: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Url",
        }],
}, { timestamps: true });
const groupSchema = new mongoose_1.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    members: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        }],
    sharedUrls: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Url",
        }],
}, { timestamps: true });
exports.Group = (0, mongoose_1.model)("Group", groupSchema);
exports.User = (0, mongoose_1.model)("User", userSchema);
exports.Url = (0, mongoose_1.model)("Url", urlSchema);
