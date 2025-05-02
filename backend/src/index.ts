import express, { json, Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { Group, Url, User } from "./db/schema";
import mongoose, { ObjectId } from "mongoose";
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
    res.status(400).json({ message: "Please enter the group name" });
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
      message: "Group is created successfully",
      groupId: savedGroup._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Group not created, please try again" });
  }
});

app.post("/groups/join", async (req: Request, res: Response) => {
  const parsedData = z.object({
    username: z.string(),
    id: z.string(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res.status(400).json({ message: "Username or Group ID missing" });
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

    const updatedGroup = await Group.findByIdAndUpdate(
      bodyData.data.id,
      {
        $addToSet: { members: user._id },
      },
      { new: true }
    );

    if (!updatedGroup) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    res
      .status(200)
      .json({ message: "Joined group successfully", group: updatedGroup });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.post("/groups/share", async (req: Request, res: Response) => {
  const parsedData = z.object({
    url: z.string(),
    id: z.string(),
    username: z.string().optional(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res.status(400).json({ message: "Please enter a url and group ID" });
    return;
  }

  try {
    const newUrl = await Url.create({ url: bodyData.data.url });

    const updatedGroup = await Group.findByIdAndUpdate(
      bodyData.data.id,
      {
        $addToSet: { sharedUrls: newUrl._id },
      },
      { new: true }
    );

    if (!updatedGroup) {
      await Url.findByIdAndDelete(newUrl._id);
      res.status(404).json({ message: "Group not found" });
      return;
    }

    if (bodyData.data.username) {
      await User.findOneAndUpdate(
        { username: bodyData.data.username },
        {
          $addToSet: { sharedUrls: newUrl._id },
        }
      );
    }

    res.status(200).json({
      message: "URL shared successfully",
      urlId: newUrl._id,
    });
  } catch (error) {
    res.status(500).json({ error: "URL not shared, please try again" });
  }
});

app.get("/groups/:id", async(req: Request, res: Response) => {
  const id = req.params.id;

  if (!id) {
    res.status(400).json({message:"Group id is required"});
    return;
  }
  try {
    const group = await Group.findById(id)
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
      res.status(404).json({message: 'Group not found'});
      return;
    }
    
    res.status(200).json({
      id: group._id,
      name: group.slug,
      members: group.members,
      urls: group.sharedUrls,
    });
    
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({error: "Server error while retrieving group"});
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
