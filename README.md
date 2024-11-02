# next-easy-s3-upload

**next-easy-s3-upload** lets you handle S3 uploads in Next.js without the usual setup.

# Features

- ⭐ **Very small**: 6.91 kB unpacked
- ✅ **Easy Setup**: Designed to work out of the box with minimal configuration.
- 😍 **Presigned Url's:** Direct secure client uploads
- 📄 **Server Actions**: Easily create distinct server actions for different uploads
- Ꝏ **Multi-Instance Support**: Manage uploads across multiple S3 buckets and instances.
- 💾 **Rich Upload Options**: Configure expiration, file size limits, file types and folder paths.
- 💿 **Metadata**: Easily add custom metadata to files for enhanced data handling.
- ✂️ **Built with Best Practices**: Designed following industry best practices for secure, reliable, and scalable file handling.

**Server:**
```ts
'use server'

const s3Client = new EasyS3Client(
    "endpoint",
    "access-key",
    "secret-access-key",
    "region"
)

export async function uploadImage(formData: FormData): Promise<S3Result> {
    return s3Client.handle(formData, {
        expires: 60,
        maxSize: 1024 * 1024, // 1MB
        bucket: "bucket",
        folder: "folder",
        types: [
            "image/png",
            "image/jpeg",
        ],
        metadata: {
            username: "username"
        }
    })
}
```
**Client:**

```tsx
'use client'

export function UploadComponent() {
    const {isUploading, startUpload, progress, error} = useEasyS3Upload(uploadImage)
    return (
        <div className="flex flex-col gap-2">
            <p className="text-red-600">{error}</p>
            <input type="file" disabled={isUploading} onChange={async e => {
                await startUpload(e.target.files![0]);
            }} />
            <p>Progress: {progress}</p>
        </div>
    )
}
```
