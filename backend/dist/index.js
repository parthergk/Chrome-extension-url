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
        res.status(400).json({ message: "Please enter the group name" });
        return;
    }
    try {
        const newGroup = new schema_1.Group({
            slug: bodyData.data.name,
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
            message: "success",
            groupId: savedGroup._id,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Group not created, please try again" });
    }
}));
app.post("/groups/join", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = zod_1.z.object({
        username: zod_1.z.string(),
        name: zod_1.z.string(),
    });
    const bodyData = parsedData.safeParse(req.body);
    if (!bodyData.success) {
        res.status(400).json({ message: "Username or Group name missing" });
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
            res.status(404).json({ message: "Group not found" });
            return;
        }
        res
            .status(200)
            .json({ message: "success", data: { groupId: updatedGroup._id, groupName: updatedGroup.slug, userId: user._id, username: user.username } });
    }
    catch (error) {
        res.status(500).json({ error: "Update failed" });
    }
}));
app.post("/groups/share", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsedData = zod_1.z.object({
        url: zod_1.z.string(),
        id: zod_1.z.string(),
        username: zod_1.z.string().optional(),
    });
    const bodyData = parsedData.safeParse(req.body);
    if (!bodyData.success) {
        res.status(400).json({ message: "Please enter a url and group ID" });
        return;
    }
    try {
        const newUrl = yield schema_1.Url.create({ url: bodyData.data.url });
        const updatedGroup = yield schema_1.Group.findByIdAndUpdate(bodyData.data.id, {
            $addToSet: { sharedUrls: newUrl._id },
        }, { new: true });
        if (!updatedGroup) {
            yield schema_1.Url.findByIdAndDelete(newUrl._id);
            res.status(404).json({ message: "Group not found" });
            return;
        }
        if (bodyData.data.username) {
            yield schema_1.User.findOneAndUpdate({ username: bodyData.data.username }, {
                $addToSet: { sharedUrls: newUrl._id },
            });
        }
        res.status(200).json({
            message: "success",
            urlId: newUrl._id,
        });
    }
    catch (error) {
        res.status(500).json({ error: "URL not shared, please try again" });
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
            path: 'sharedUrls',
            model: 'Url',
            select: 'url -_id'
        })
            .populate({
            path: 'members',
            model: 'User',
            select: 'username -_id'
        });
        if (!group) {
            res.status(404).json({ message: 'Group not found' });
            return;
        }
        res.status(200).json({
            id: group._id,
            name: group.slug,
            members: group.members,
            urls: group.sharedUrls,
        });
    }
    catch (error) {
        console.error("Error fetching group:", error);
        res.status(500).json({ error: "Server error while retrieving group" });
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
