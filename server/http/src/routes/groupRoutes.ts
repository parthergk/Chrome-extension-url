import express, { Request, Response } from "express";
import { z } from "zod";
import { Group, Url, User } from "../db/schema";
import mongoose from "mongoose";

const router = express.Router();

router.post("/create", async (req: Request, res: Response) => {
  const parsedData = z.object({
    name: z.string(),
    creatorUsername: z.string().optional(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res
      .status(400)
      .json({ status: "error", message: "Please enter the group name" });
    return;
  }

  try {
    const exist = await Group.findOne({ slug: bodyData.data.name });
    if (exist) {
      res
        .status(400)
        .json({ status: "error", message: "Group Name already exist" });
      return;
    }

    const newGroup = new Group({
      slug: bodyData.data.name.toLocaleLowerCase(),
      members: [],
      sharedUrls: [],
    });

    if (bodyData.data.creatorUsername) {
      let creator = await User.findOne({
        username: bodyData.data.creatorUsername,
      });
      if (!creator) {
        creator = await User.create({
          username: bodyData.data.creatorUsername.toLocaleLowerCase(),
          sharedUrls: [],
        });
      }
      newGroup.members.push(creator._id as mongoose.Types.ObjectId);
    }

    const savedGroup = await newGroup.save();

    res.status(200).json({
      status: "success",
      message: "Group created successfully",
      groupId: savedGroup._id,
    });
  } catch (error) {
    console.error("Error in /groups/create:", error);
    res.status(500).json({
      status: "error",
      message: "Group not created, please try again",
    });
  }
});

router.post("/join", async (req: Request, res: Response) => {
  const parsedData = z.object({
    username: z.string(),
    name: z.string(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res
      .status(400)
      .json({ status: "error", message: "Username or Group name missing" });
    return;
  }

  try {
    let user = await User.findOne({ username: bodyData.data.username });
    if (!user) {
      user = await User.create({
        username: bodyData.data.username.toLocaleLowerCase(),
        sharedUrls: [],
      });
    }

    const updatedGroup = await Group.findOneAndUpdate(
      { slug: bodyData.data.name },
      { $addToSet: { members: user._id } },
      { new: true }
    );

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
  } catch (error) {
    console.error("Error in /groups/join", error);
    res.status(500).json({ status: "error", message: "Update failed" });
  }
});

router.post("/share", async (req: Request, res: Response) => {
  const parsedData = z.object({
    id: z.string(),
    url: z.string(),
    title: z.string().optional(),
    notes: z.string().optional(),
    category: z.string().optional(),
    username: z.string().optional(),
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
    const {
      url,
      title,
      notes,
      category,
      id: groupId,
      username,
    } = bodyData.data;

    let urlDoc = await Url.findOne({ url });

    if (urlDoc) {
      const alreadyShared = await Group.findOne({
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
    } else {
      urlDoc = await Url.create({ url, title, notes, category });
    }

    await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { sharedUrls: urlDoc._id } },
      { new: true }
    );

    if (username) {
      await User.findOneAndUpdate(
        { username },
        { $addToSet: { sharedUrls: urlDoc._id } }
      );
    }

    res.status(200).json({
      status: "success",
      message: "URL shared successfully.",
      urlId: urlDoc._id,
    });
  } catch (error) {
    console.error("Error in /groups/share:", error);
    res.status(500).json({
      status: "error",
      message: "URL not shared, please try again.",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;

  if (!id) {
    res.status(400).json({ message: "Group id is required" });
    return;
  }

  try {
    const group = await Group.findById(id)
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
  } catch (error) {
    console.error("Error in /groups/:id", error);
    res
      .status(500)
      .json({ status: "error", error: "Server error while retrieving group" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Url.findByIdAndDelete(id);
    res.status(200).json({ message: "success" });
  } catch (error) {
    console.error("Error in /bookmark/:id", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete bookmark" });
  }
});

export default router;
