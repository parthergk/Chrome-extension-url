import express, { json, Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { Group, Url, User } from "./db/schema";
import mongoose from "mongoose";
const app = express();

app.use(cors());
app.use(json());

app.post("/groups/create", async (req: Request, res: Response) => {
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
    const newGroup = new Group({
      slug: bodyData.data.name,
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
      message: "success",
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

app.post("/groups/join", async (req: Request, res: Response) => {
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
      {
        $addToSet: { members: user._id },
      },
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

app.post("/groups/share", async (req: Request, res: Response) => {
  const parsedData = z.object({
    groupName: z.string(),
    url: z.string().url(), // validate URL format
    title: z.string().optional(),
    notes: z.string().optional(),
    category: z.string().optional(),
    id: z.string(), // group ID
    username: z.string().optional(),
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
    const {
      url,
      title,
      notes,
      category,
      id: groupId,
      username,
    } = bodyData.data;

    // 1. Check if URL already exists
    let urlDoc = await Url.findOne({ url });

    if (urlDoc) {
      // 2. If it exists, check if it's already shared in the group
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
      // 3. Create URL if it doesn't exist
      urlDoc = await Url.create({ url, title, notes, category });
    }

    // 4. Add URL to the group (prevent duplicates with $addToSet)
    await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { sharedUrls: urlDoc._id } },
      { new: true }
    );

    // 5. Also add to user, if username provided
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
    return;
  } catch (error) {
    console.error("Error in /groups/share:", error);
    res.status(500).json({
      status: "error",
      message: "URL not shared, please try again.",
    });
    return;
  }
});

app.get("/groups/:id", async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Error in /groups/:", error);
    res
      .status(500)
      .json({ status: "error", error: "Server error while retrieving group" });
  }
});

app.delete("/bookmark/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Url.findByIdAndDelete(id);
    res.status(200).json({ message: "success" });
  } catch (error) {
    console.error("Error in /bookmark/:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete bookmark" });
  }
});
function main() {
  return mongoose.connect(
    "mongodb+srv://gauravKumar:gaurav123@cluster0.swj1o.mongodb.net/?retryWrites=true&w=majority"
  );
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
