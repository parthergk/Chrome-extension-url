import express, { json, Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { Group, Url, User } from "./db/schema";
const app = express();

app.use(cors());
app.use(json());

app.post("/groups/create", async (req: Request, res: Response) => {
  const parsedData = z.object({
    name: z.string(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res.status(400).json({ message: "Please enter the group name" });
    return;
  }

  try {
    const newGroup = new Group({ slug: bodyData.data.name });
    const saveGroup = await newGroup.save();

    if (!saveGroup._id) {
      res.status(500).json({ message: "Group not created" });
      return;
    }

    res.status(200).json({
      message: "Group is created successfully",
      groupId: saveGroup._id,
    });
  } catch (error) {
    res.status(500).json({ error: "Group not created, please try again" });
  }
});

app.post("/groups/join", async (req: Request, res: Response) => {
  const parsedData = z.object({
    userId: z.string(),
    id: z.string(),
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res.status(400).json({ message: "UserId or Group ID missing" });
    return;
  }

  try {
    const user = await User.findOne({ userId: bodyData.data.userId });
    if (!user) {
      await User.create({ userId: bodyData.data.userId });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      bodyData.data.id,
      {
        $addToSet: { members: bodyData.data.userId },
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
    id: z.string()
  });

  const bodyData = parsedData.safeParse(req.body);
  if (!bodyData.success) {
    res.status(400).json({ message: "Please enter a url" });
    return;
  };

  try {
      const url = await Url.create({url: bodyData.data.url});
      res.status(200).json({message:"Url shared successfully"});

      await Group.findByIdAndUpdate(
        bodyData.data.id,
        {
          $addToSet: { sharedUrls: url._id },
        },
        { new: true }
      ); 
  } catch (error) {
    res.status(500).json({error:"url not shared"});
  }
});

app.get("/groups/:id", (req: Request, res: Response) => {});

app.post("/user/groups/:userId", (req: Request, res: Response) => {});

app.listen(3000, () => {
  console.log("https server is runing on the port 3000");
});
