import path from "node:path";

export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), ".uploads"));

export const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime",
};
