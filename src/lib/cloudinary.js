import { v2 as cloudinary } from "cloudinary";

export const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

export function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME || "";
}

function client() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function uploadImage(buffer, filename = "vimuhet.jpg") {
  const api = client();
  const dataUri = `data:image/${guessExt(filename)};base64,${buffer.toString("base64")}`;
  const result = await api.uploader.upload(dataUri, {
    folder: process.env.CLOUDINARY_FOLDER || "vimuhet",
    resource_type: "image",
  });
  return result.secure_url;
}

function guessExt(filename) {
  const match = /\.([a-z0-9]+)$/i.exec(filename || "");
  const ext = match ? match[1].toLowerCase() : "jpg";
  if (ext === "jpg") return "jpeg";
  return ["png", "webp", "avif", "gif", "jpeg"].includes(ext) ? ext : "jpeg";
}
