import {GetObjectCommand, PutObjectCommand, S3} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import SHA256 from "crypto-js/sha256";
import encHex from "crypto-js/enc-hex";
import {useState} from "react";
import axios from "axios";

export interface UploadOptions {
    expires: number;
    maxSize: number;
    types: string[];
    bucket: string;
    metadata: Record<string, string>;
    folder: string,
    successCallbacks: SuccessCallbacks
}

export interface S3Result {
    success: boolean,
    error?: string,
    data?: string,
    url?: string,
    filename?: string
}

export interface FileInfo {
    name: string,
    size: number,
    type: string
}

export interface SignedURLOptions {
    signedUrl: string,
    objectUrl: string,
    filename: string,
    folder: string,
    expiresIn: number,
    mimeType: string,
    size: number,
    originalName: string,
}

export interface SuccessCallbacks {
    signedURLCreated: (options: SignedURLOptions) => Promise<void>
    fileUploaded: (filename: string) => Promise<boolean>
}

export class EasyS3Client {
    s3Client: S3
    endpoint: string

    constructor(endpoint: string, accessKey: string, secretAccessKey: string, region: string) {
        this.s3Client = new S3({
            endpoint: endpoint,
            region: region,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretAccessKey
            },
            forcePathStyle: true
        });
        this.endpoint = endpoint
    }

    private fromFormData(formData: FormData): {
        checksum: string,
        file: FileInfo
    } {
        const checksum = formData.get('checksum') as string;

        let file;
        try {
            file = JSON.parse(formData.get('file') as string) as { name: string; size: number; type: string };
        } catch {
            throw new Error('Invalid file JSON format');
        }

        return {
            checksum: checksum,
            file: file
        }
    }

    async handle(formData: FormData, options: UploadOptions): Promise<S3Result> {
        const {file, checksum} = this.fromFormData(formData)
        return this.generateSignedURL(file, checksum, options)
    }

    async validate(formData: FormData, options: UploadOptions): Promise<boolean> {
        const fileName = formData.get("filename") as string
        return options.successCallbacks.fileUploaded(fileName)
    }

    private async generateSignedURL(
        file: FileInfo,
        checksum: string,
        options: UploadOptions
    ): Promise<S3Result> {
        const tooBig = file.size > options.maxSize
        if (tooBig) return {
            success: false,
            error: "The file is too big!",
            data: undefined
        }

        const correctType = options.types.includes(file.type)
        if (!correctType) return {
            success: false,
            error: "The format of the file is wrong!",
            data: undefined
        }

        const split = file.name.split('.');
        const extension = split.length > 1 ? `.${split[split.length - 1]}` : '';

        const fileName = `${crypto.randomUUID()}${extension}`

        const putObjectCommand = new PutObjectCommand({
            Bucket: options.bucket,
            Key: `${options.folder}/${fileName}`,
            ContentType: file.type,
            ContentLength: file.size,
            ChecksumSHA256: checksum,
            Metadata: options.metadata
        })

        const signedURL = await getSignedUrl(this.s3Client, putObjectCommand, {
            expiresIn: options.expires,
        })

        const objectUrl = `${this.endpoint}/${options.bucket}/${options.folder}${fileName}`

        await options.successCallbacks.signedURLCreated({
            objectUrl: objectUrl,
            filename: fileName,
            mimeType: file.type,
            size: file.size,
            expiresIn: options.expires,
            folder: options.folder,
            signedUrl: signedURL,
            originalName: file.name
        })

        return {
            success: true,
            data: signedURL,
            error: undefined,
            url: objectUrl,
            filename: fileName,
        }
    }
}

const computeSHA256 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const wordArray = SHA256(encHex.parse(Buffer.from(buffer).toString('hex')));
    return wordArray.toString(encHex);
};


export function useEasyS3Upload(action: (formData: FormData) => Promise<S3Result>, onSuccess?: (url: string) => void, onSuccessServer?: (formData: FormData) => Promise<boolean>) {
    const [error, setError] = useState<string>("")
    const [isUploading, setIsUploading] = useState<boolean>(false)
    const [progress, setProgress] = useState<number>(0)

    function initState() {
        setIsUploading(true);
        setError("")
        setProgress(0)
    }

    function handleError(result: S3Result) {
        setError(result.error!)
        setIsUploading(false)
    }

    async function startUpload(file: File) {
        initState()

        const checksum = await computeSHA256(file);

        const simpleFile: FileInfo = {
            name: file.name,
            size: file.size,
            type: file.type,
        }

        const formData = new FormData();
        formData.append("checksum", checksum);
        formData.append("file", JSON.stringify(simpleFile));

        const result = await action(formData)
        if (!result.success) {
            handleError(result)
            return
        }

        let url = result.data
        if (!url) throw new Error("URL is missing although success is true")

        await axios.put(url, file, {
            headers: {
                'Content-Type': file.type
            },
            onUploadProgress: progressEvent => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
                setProgress(percentCompleted);
            }
        });

        if (result.url && result.filename) {
            const formData = new FormData()
            formData.append("filename", result.filename)
            if (onSuccessServer) {
                const success = await onSuccessServer(formData)
                if (!success) {
                    setError("Something went wrong!")
                    return
                }
            }
            if (onSuccess) {
                onSuccess(result.url)
            }
        }

        setIsUploading(false)
        setError("")
        setProgress(100)
    }

    return {
        startUpload,
        progress,
        error,
        isUploading
    }
}