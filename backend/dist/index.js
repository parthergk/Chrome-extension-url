"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const schema_1 = require("./db/schema");
const mongoose_1 = __importDefault(require("mongoose"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, express_1.json)());
app.post("/groups/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            res.status(400).json({ status: "error", message: "Group Name already exist" });
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
app.post("/groups/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const updatedGroup = yield schema_1.Group.findOneAndUpdate({ slug: bodyData.data.name }, {
            $addToSet: { members: user._id },
        }, { new: true });
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
app.post("/groups/share", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        res
            .status(400)
            .json({
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
        return;
    }
    catch (error) {
        console.error("Error in /groups/share:", error);
        res.status(500).json({
            status: "error",
            message: "URL not shared, please try again.",
        });
        return;
    }
}));
app.get("/groups/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            .populate({
            path: "members",
            model: "User",
            select: "username -_id",
        });
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
        console.error("Error in /groups/:", error);
        res
            .status(500)
            .json({ status: "error", error: "Server error while retrieving group" });
    }
}));
app.delete("/bookmark/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield schema_1.Url.findByIdAndDelete(id);
        res.status(200).json({ message: "success" });
    }
    catch (error) {
        console.error("Error in /bookmark/:", error);
        res
            .status(500)
            .json({ status: "error", message: "Failed to delete bookmark" });
    }
}));
function main() {
    return mongoose_1.default.connect("mongodb+srv://gauravKumar:gaurav123@cluster0.swj1o.mongodb.net/?retryWrites=true&w=majority");
}
main()
    .then(() => {
    console.log("db is connected");
    app.listen(3000, () => {
        console.log("https server is runing on the port 3000");
    });
})
    .catch(() => {
    console.log("db not connected");
});
