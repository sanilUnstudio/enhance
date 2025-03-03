"use client"
import React, { useState } from 'react'
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";


function imageToBlob(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
            const blob = new Blob([reader.result], { type: file.type });
            resolve(blob);
        };
        reader.onerror = (error) => reject(error);
    });
}


const Page = () => {
    const [image, setImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<null | string>(null);
    const { toast } = useToast()
    // Load an image onto the canvas
    const loadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const file = event.target.files[0];
        setImage(file);
        event.target.value = ''
    };

    const upscaleImage = async () => {
        if (!image) {
            toast({
                className: "bg-black text-white border border-white border-opacity-40",
                description: "Please add image or select scale value.",
            })
            return;
        }
        setIsLoading(true);

        try {
            const blob = await imageToBlob(image);

            const key = `img2img-products/${uuidv4()}.png`; // Us

            const response = await fetch('/api/presignedUrl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key,
                    fileType: 'image/png', // Spe
                }),
            });

            const { uploadUrl } = await response.json();

            if (!uploadUrl) {
                throw new Error('Failed to get upload URL.');
            }

            // Upload blob to S3 using the pre-signed URL
            const s3Response = await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': 'image/png',
                },
            });

            if (!s3Response.ok) {
                throw new Error('Failed to upload file to S3.');
            }

            const url = `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${key}`;

            const replicateResponse = await axios.post('/api/recraft-upscale', {
                image: url,
            })

            if (replicateResponse.status !== 200) {
                toast({
                    className: "bg-black text-white border border-white border-opacity-40",
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: replicateResponse.status,
                })
            }
            const deleteFile = await axios.post('/api/deleteS3Object', {
                key: key
            })


            console.log("response", replicateResponse)
            setResult(replicateResponse.data.output);
            setIsLoading(false);
        } catch (err) {
            console.log("Error", err)
            toast({
                className: "bg-black text-white border border-white border-opacity-40",
                description: `Error in upscale ${err}`,
            })
            setIsLoading(false);
        }
    }

    const handleReset = () => {
        setResult(null);
        setImage(null);
    };


    const handleResult = () => {
        if (result) {
            window.open(result, '_blank');
            handleReset();
        }
    }



    return (
        <div className='bg-black w-full h-screen text-white'>


            {!result ?
                <div className='flex flex-col items-center justify-center w-1/2 mx-auto'>
                    {
                        <div className="flex flex-col gap-2 w-full  border h-[400px] mt-4 p-2 border-white border-opacity-40 rounded-md">
                            {!image ? <>
                                <label className="text-center" htmlFor="original-image">Image</label>
                                <input id='original-image' type="file" accept="image/*" onChange={loadImage} />
                            </>
                                :
                                <div className='w-full h-full'>
                                    <Image alt='original-image' src={URL.createObjectURL(image)} width={100} height={100} className="w-full h-full object-contain" />
                                </div>
                            }
                        </div>
                    }

                    <div className='flex flex-col items-end w-full mt-2'>
                        <Button className="border border-white border-opacity-40 p-2 rounded-lg" onClick={upscaleImage}>
                            {isLoading && <Loader2 className="animate-spin" />}
                            Upscale Image</Button>
                    </div>
                </div>
                :
                <div className='h-full w-1/2 pt-4 mx-auto'>

                    <div className="h-[70%] w-full border border-white border-opacity-40 mx-auto rounded-lg overflow-hidden relative">
                        {result && <img alt='result-image' src={result} className="h-full w-full  object-contain" />}
                        <X onClick={handleReset} size={18} className='absolute top-1 right-1 cursor-pointer' />
                    </div>

                    <div className='flex flex-col items-end w-full mt-2'>
                        <Button className="border border-white border-opacity-40 p-2 rounded-lg" onClick={handleResult}>
                            Open in new tab
                        </Button>
                    </div>
                </div>
            }
        </div>
    )
}

export default Page