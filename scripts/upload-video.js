import { put } from "@vercel/blob";
import fs from "fs";

async function upload() {
  const token = process.env.NATLOVERS_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error("NATLOVERS_READ_WRITE_TOKEN is missing in .env.local");
  }

  const file = fs.readFileSync("./public/videos/natlovers-hero.mp4");

  const blob = await put("natlovers-hero.mp4", file, {
    access: "public",
    token: token,
  });

  console.log("Uploaded video URL:");
  console.log(blob.url);
}

upload();