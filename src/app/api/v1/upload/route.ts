import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { z } from "zod";
import crypto from "crypto";

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024 * 1024), // 5GB max
  mimeType: z.string().min(1),
});

const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "application/pdf",
]);

/**
 * POST /api/v1/upload — Get a presigned upload URL for direct file upload.
 *
 * Returns { uploadUrl, fileKey } for the client to PUT the file directly
 * to Supabase Storage, then pass fileKey to POST /api/v1/jobs.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const input = uploadRequestSchema.parse(body);

    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${input.mimeType}`,
          allowed: Array.from(ALLOWED_MIME_TYPES),
        },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 503 },
      );
    }

    // Generate a unique file key
    const ext = extFromMime(input.mimeType) ?? extFromName(input.fileName) ?? "bin";
    const uniqueId = crypto.randomUUID();
    const fileKey = `uploads/${user.id}/${uniqueId}.${ext}`;
    const bucket = "media";

    // Create a signed upload URL via Supabase Storage REST API
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/upload/sign/${bucket}/${fileKey}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ upsert: false }),
      },
    );

    if (!response.ok) {
      // Fallback: return a direct upload endpoint that the server will proxy
      // This works even if signed uploads aren't available on the Supabase plan
      return NextResponse.json({
        uploadUrl: `/api/v1/upload/direct`,
        fileKey,
        method: "PUT",
        headers: {
          "X-File-Key": fileKey,
          "Content-Type": input.mimeType,
        },
      });
    }

    const result = (await response.json()) as { url: string };
    const uploadUrl = `${supabaseUrl}/storage/v1${result.url}`;

    return NextResponse.json({
      uploadUrl,
      fileKey,
      method: "PUT",
      headers: {
        "Content-Type": input.mimeType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[api] POST /api/v1/upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function extFromMime(mime: string): string | undefined {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "application/pdf": "pdf",
  };
  return map[mime];
}

function extFromName(name: string): string | undefined {
  const match = name.match(/\.(\w+)$/);
  return match?.[1]?.toLowerCase();
}
