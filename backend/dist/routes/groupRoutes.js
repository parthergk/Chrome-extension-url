"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const schema_1 = require("../db/schema");
const router = express_1.default.Router();
router.post("/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = zod_1.z.object({
        name: zod_1.z.string(),
        creatorUsername: zod_1.z.string().optional(),
    });
    const bodyData = parsedData.safeParse(req.body);
    if (!bodyData.success) {
        res
            .status(400)
            .json({ status: "error", message: "Please enter the group name" });
        return;
    }
    try {
        const exist = yield schema_1.Group.findOne({ slug: bodyData.data.name });
        if (exist) {
            res
                .status(400)
                .json({ status: "error", message: "Group Name already exist" });
            return;
        }
        const newGroup = new schema_1.Group({
            slug: bodyData.data.name.toLocaleLowerCase(),
            members: [],
            sharedUrls: [],
        });
        if (bodyData.data.creatorUsername) {
            let creator = yield schema_1.User.findOne({
                username: bodyData.data.creatorUsername,
            });
            if (!creator) {
                creator = yield schema_1.User.create({
                    username: bodyData.data.creatorUsername.toLocaleLowerCase(),
                    sharedUrls: [],
                });
            }
            newGroup.members.push(creator._id);
        }
        const savedGroup = yield newGroup.save();
        res.status(200).json({
            status: "success",
            message: "Group created successfully",
            groupId: savedGroup._id,
        });
    }
    catch (error) {
        console.error("Error in /groups/create:", error);
        res.status(500).json({
            status: "error",
            message: "Group not created, please try again",
        });
    }
}));
router.post("/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = zod_1.z.object({
        username: zod_1.z.string(),
        name: zod_1.z.string(),
    });
    const bodyData = parsedData.safeParse(req.body);
    if (!bodyData.success) {
        res
            .status(400)
            .json({ status: "error", message: "Username or Group name missing" });
        return;
    }
    try {
        let user = yield schema_1.User.findOne({ username: bodyData.data.username });
        if (!user) {
            user = yield schema_1.User.create({
                username: bodyData.data.username.toLocaleLowerCase(),
                sharedUrls: [],
            });
        }
        const updatedGroup = yield schema_1.Group.findOneAndUpdate({ slug: bodyData.data.name }, { $addToSet: { members: user._id } }, { new: true });
        if (!updatedGroup) {
            res.status(404).json({ status: "error", message: "Group not found" });
            return;
        }
        res.status(200).json({
            message: "success",
            data: {
                groupId: updatedGroup._id,
                groupName: updatedGroup.slug,
                userId: user._id,
                username: user.username,
            },
        });
    }
    catch (error) {
        console.error("Error in /groups/join", error);
        res.status(500).json({ status: "error", message: "Update failed" });
    }
}));
router.post("/share", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = zod_1.z.object({
        id: zod_1.z.string(),
        url: zod_1.z.string(),
        title: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        username: zod_1.z.string().optional(),
    });
    const bodyData = parsedData.safeParse(req.body);
    if (!bodyData.success) {
        res.status(400).json({
            status: "error",
            message: "Please enter a valid URL and group ID",
        });
        return;
    }
    try {
        const { url, title, notes, category, id: groupId, username, } = bodyData.data;
        let urlDoc = yield schema_1.Url.findOne({ url });
        if (urlDoc) {
            const alreadyShared = yield schema_1.Group.findOne({
                _id: groupId,
                sharedUrls: { $in: [urlDoc._id] },
            });
            if (alreadyShared) {
                res.status(400).json({
                    status: "error",
                    message: "URL already shared in this group.",
                });
                return;
            }
        }
        else {
            urlDoc = yield schema_1.Url.create({ url, title, notes, category });
        }
        yield schema_1.Group.findByIdAndUpdate(groupId, { $addToSet: { sharedUrls: urlDoc._id } }, { new: true });
        if (username) {
            yield schema_1.User.findOneAndUpdate({ username }, { $addToSet: { sharedUrls: urlDoc._id } });
        }
        res.status(200).json({
            status: "success",
            message: "URL shared successfully.",
            urlId: urlDoc._id,
        });
    }
    catch (error) {
        console.error("Error in /groups/share:", error);
        res.status(500).json({
            status: "error",
            message: "URL not shared, please try again.",
        });
    }
}));
router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    if (!id) {
        res.status(400).json({ message: "Group id is required" });
        return;
    }
    try {
        const group = yield schema_1.Group.findById(id)
            .populate({
            path: "sharedUrls",
            model: "Url",
            select: "url title notes category",
        })
            .populate({ path: "members", model: "User", select: "username -_id" });
        if (!group) {
            res.status(404).json({ message: "Group not found" });
            return;
        }
        res.status(200).json({
            message: "success",
            id: group._id,
            name: group.slug,
            members: group.members,
            urls: group.sharedUrls,
        });
    }
    catch (error) {
        console.error("Error in /groups/:id", error);
        res
            .status(500)
            .json({ status: "error", error: "Server error while retrieving group" });
    }
}));
router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield schema_1.Url.findByIdAndDelete(id);
        res.status(200).json({ message: "success" });
    }
    catch (error) {
        console.error("Error in /bookmark/:id", error);
        res
            .status(500)
            .json({ status: "error", message: "Failed to delete bookmark" });
    }
}));
exports.default = router;
