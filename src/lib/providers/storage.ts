// ─── Storage Provider Interface ─────────────────────────────────────

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  /** Storage bucket or container name */
  bucket?: string;
}

export interface SignedUrlOptions {
  /** URL expiration in seconds */
  expiresIn?: number;
}

export interface StorageProvider {
  readonly name: string;

  /**
   * Upload a file to storage.
   * @param key - Storage key / file path
   * @param data - File data as Buffer or ReadableStream
   * @param options - Upload configuration
   * @returns The storage key of the uploaded file
   */
  upload(
    key: string,
    data: Buffer | ReadableStream,
    options?: UploadOptions,
  ): Promise<string>;

  /**
   * Download a file from storage.
   * @param key - Storage key / file path
   * @returns File data as Buffer
   */
  download(key: string): Promise<Buffer>;

  /**
   * Generate a signed (temporary) URL for a file.
   * @param key - Storage key / file path
   * @param options - URL configuration
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Delete a file from storage.
   * @param key - Storage key / file path
   */
  delete(key: string): Promise<void>;

  /**
   * Check if the provider is available and properly configured.
   */
  isAvailable(): Promise<boolean>;
}
