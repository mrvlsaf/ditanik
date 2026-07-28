export type StoredFile = {
  fileKey: string;
  fileName: string;
  mimeType: string;
};

export type StoredFileBytes = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
};

export type FileStorage = {
  save(input: Readonly<{ file: File; folder: string }>): Promise<StoredFile>;
  read(fileKey: string): Promise<StoredFileBytes>;
};
