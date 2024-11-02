'use server'

import {EasyS3Client, S3Result, UploadOptions} from "next-easy-s3-upload";
import {prisma} from "@/app/lib/prisma";

const s3Client = new EasyS3Client(
    process.env.AWS_ENDPOINT!,
    process.env.AWS_ACCESS_KEY!,
    process.env.AWS_SECRET_KEY!,
    process.env.AWS_REGION!,
)

const options: UploadOptions = {
    bucket: process.env.AWS_BUCKET_NAME!,
    folder: "",
    expires: 60,
    maxSize: 1024 * 1024 * 5, // 5 MB
    types: [
        "image/png",
        "image/jpeg",
        "image/jpg",
    ],
    metadata: {},
    successCallbacks: {
        signedURLCreated: async options => {
            await prisma.signedFile.create({
                data: {
                    filename: options.filename,
                    folder: options.folder,
                    size: options.size,
                    mimeType: options.mimeType,
                    signedUrl: options.signedUrl,
                    objectUrl: options.objectUrl,
                    originalName: options.originalName,
                    expiresAt: new Date(Date.now() + options.expiresIn * 1000)
                }
            })
        },
        fileUploaded: async (filename) => {
            // insert in database and remove from signed Url table
            // return true if database entry succeeded

            const signedFile = await prisma.signedFile.findFirst({
                where: {
                    filename
                }
            })

            if (!signedFile) return false

            await prisma.file.create({
                data: {
                    name: signedFile.filename,
                    originalName: signedFile.originalName,
                    size: signedFile.size,
                    mimeType: signedFile.mimeType,
                    url: signedFile.objectUrl,
                }
            })

            await prisma.signedFile.delete({
                where: {
                    filename
                }
            })

            return true
        }
    }
}

export async function uploadImage(formData: FormData): Promise<S3Result> {
    return s3Client.handle(formData, options) // Create options here if you want to add auth metadata
}


export async function validateUpload(formData: FormData): Promise<boolean> {
    return s3Client.validate(formData, options)
}