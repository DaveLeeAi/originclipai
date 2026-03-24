import {
  type StorageProvider,
  type UploadOptions,
  type SignedUrlOptions,
} from "./storage";

const DEFAULT_BUCKET = "media";
const DEFAULT_SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Supabase Storage provider implementation.
 * Uses the Supabase REST storage API directly to avoid
 * pulling in the full @supabase/supabase-js client in workers.
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase-storage";
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for SupabaseStorageProvider",
      );
    }
    this.supabaseUrl = url;
    this.serviceRoleKey = key;
  }

  async upload(
    key: string,
    data: Buffer | ReadableStream,
    options?: UploadOptions,
  ): Promise<string> {
    const bucket = options?.bucket ?? DEFAULT_BUCKET;
    const contentType = options?.contentType ?? "application/octet-stream";

    const rawBytes = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
    // Convert to ArrayBuffer for Blob compatibility with strict TS
    const arrayBuffer = rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: contentType });

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${bucket}/${key}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: blob,
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Supabase Storage upload failed: ${response.status} ${err}`);
    }

    return key;
  }

  async download(key: string, bucket?: string): Promise<Buffer> {
    const b = bucket ?? DEFAULT_BUCKET;
    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${b}/${key}`,
      {
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Supabase Storage download failed: ${response.status}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getSignedUrl(
    key: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const bucket = DEFAULT_BUCKET;
    const expiresIn = options?.expiresIn ?? DEFAULT_SIGNED_URL_EXPIRY;

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/sign/${bucket}/${key}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn }),
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase Storage signedUrl failed: ${response.status}`);
    }

    const result = (await response.json()) as { signedURL: string };
    return `${this.supabaseUrl}/storage/v1${result.signedURL}`;
  }

  async delete(key: string): Promise<void> {
    const bucket = DEFAULT_BUCKET;
    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${bucket}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [key] }),
      },
    );

    if (!response.ok) {
      throw new Error(`Supabase Storage delete failed: ${response.status}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/storage/v1/bucket`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceRoleKey}`,
          },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) {
      chunks.push(result.value);
    }
  }
  return Buffer.concat(chunks);
}

let storageInstance: SupabaseStorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new SupabaseStorageProvider();
  }
  return storageInstance;
}
