'use client'

import React, {useCallback, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import {useEasyS3Upload} from "next-easy-s3-upload";
import {uploadImage, validateUpload} from "@/app/lib/upload";

export function DropZone() {
    const [file, setFile] = useState<File>()
    const [success, setSuccess] = useState<boolean>(false)
    // @ts-ignore
    const onDrop = useCallback((acceptedFiles) => {
        setFile(acceptedFiles[0])
    }, [])
    const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, maxFiles: 1})
    const {error, progress, isUploading, startUpload} = useEasyS3Upload(uploadImage, url => {
        setSuccess(true)
        setUrl(url)
    }, validateUpload)

    const [url, setUrl] = useState<string>('')

    return (
        <div>
            <div {...getRootProps()}>
                <input {...getInputProps()} />
                {
                    isDragActive ?
                        <p>Drop the file here ...</p> :
                        <p>Drag 'n' drop a file here, or click to select files</p>
                }
            </div>
            <div className="flex flex-col items-center gap-2 mt-3">
                {
                    file && (
                        <img className="w-40 h-40 rounded-lg" src={URL.createObjectURL(file)} alt={file.name}/>
                    )
                }
                {
                    error.length > 0 && (
                        <p className="text-red-600">{error}</p>
                    )
                }
                {
                    file && (
                        <button onClick={async () => {
                            if (file) {
                                await startUpload(file)
                            }
                        }} disabled={isUploading} className="bg-blue-500 p-3 rounded-lg w-full">Upload</button>
                    )
                }
                {
                    isUploading && (
                        <p>Progress: {progress}</p>
                    )
                }
                {
                    success && (
                        <p className="text-green-400">You have uploaded the file!</p>
                    )
                }
                {
                    url && url.length > 0 && (
                        <img src={url} className="w-40 h-40 rounded-lg" alt={"Your uploaded image"} />
                    )
                }
            </div>
        </div>
    )
}