"use client"
import React, { useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { resizeImage, resizeImageWBg } from "../lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


const ImageUpscaler = () => {
    const [image, setImage] = useState(null);
    const [bgRemovedImage, setBgRemovedImage] = useState(null);
    const [scale, setScale] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const { toast } = useToast();
    const router = useRouter();


    // Load an image onto the canvas
    const loadImage = async (event) => {
        const file = event.target.files[0];
        setImage(file);
        event.target.value = ''
    };

    const loadBgImage = async (event) => {
        const file = event.target.files[0];
        setBgRemovedImage(file);
        event.target.value = ''
    };

    // Send the images to the backend for upscaling
    const upscaleImage = async () => {
        if (!image || !bgRemovedImage || !scale) {
            toast({
                className:"bg-black text-white border border-white border-opacity-40",
                description: "Please add image or select scale value.",
            })
            return;
        }
        setIsLoading(true);

        try {
            const { maskData, newHeight, newWidth } = await resizeImage(image, scale);
            const bgMaskData = await resizeImageWBg({ file: bgRemovedImage, targetHeight: newHeight, targetWidth: newWidth });

            const base64s = [bgMaskData, maskData];
            // Uploading image to s3
            const urls = await Promise.all(base64s.map(async (base64) => {
                const base64Data = base64.split(',')[1];
                const blob = await fetch(`data:image/png;base64,${base64Data}`).then(res => res.blob());
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
                return { key, url };
            }))

            const replicateResponse = await axios.post('/api/upscale', {
                mask: urls[0].url,
                image: urls[1].url,
                scale: Number(scale)
            })

            if (replicateResponse.status !== 200) {
                toast({
                    className: "bg-black text-white border border-white border-opacity-40",
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: replicateResponse.status,
                })
            }
            const deleteFile = await Promise.all(urls.map(async (item) => {
                const response = await axios.post('/api/deleteS3Object', {
                    key: item.key
                })

                return response;
            }))
            console.log("response", replicateResponse)
            setResult(replicateResponse.data.output);
        } catch (error) {
            console.error("Upscaling failed:", error);
            toast({
                className: "bg-black text-white border border-white border-opacity-40",
                variant: "destructive",
                title: `Status code - ${error.status}`,
                description: "An error occurred while upscaling. Please try again.",
            })
        }
        setIsLoading(false);
    };


    const handleResult = () => {
        if (result) {
            window.open(result, '_blank');
            handleReset();
        }
    }

    const handleReset = () => {
        setImage(null);
        setBgRemovedImage(null);
        setScale(undefined);
        setIsLoading(false);
        setResult(null);
    }

    return (
        <div className="bg-black h-screen text-white  pt-8">

            <h1 className="text-center text-2xl ">Image Upscaler</h1>
          

            {!result ? <div className="flex flex-col gap-6">
                <div className="mx-auto w-10/12 flex items-center justify-between">
                    <Select value={scale} onValueChange={setScale}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue className="text-white" placeholder="Select Scale value" />
                        </SelectTrigger>
                        <SelectContent className="bg-black text-white">
                            <SelectGroup >
                                {/* <SelectLabel>Select Scale value</SelectLabel> */}
                                <SelectItem key={2} value={'2'}>
                                    2
                                </SelectItem>
                                <SelectItem key={4} value={'4'}>
                                    4
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Button onClick={()=> router.push('/recraft')} className="border border-white border-opacity-40 p-2 rounded-lg">Recraft Upscale</Button>
                </div>


                <div className="grid grid-cols-2 w-10/12 mx-auto h-[250px] border border-white border-opacity-40 rounded-lg overflow-hidden">
                    {!image ?
                        <div className="flex flex-col gap-2  border-r p-2 border-white border-opacity-40">
                            <label className="text-center" htmlFor="original-image">Original Image</label>
                            <input id='original-image' type="file" accept="image/*" onChange={loadImage} />
                        </div>
                        : <div className="w-full h-[250px] border-r border-white border-opacity-40 relative">
                            <X onClick={() => {
                                if (isLoading) return;
                                setImage(null);
                            }} className="absolute top-1 right-2 z-10 cursor-pointer" />
                            <Image alt='original-image' src={URL.createObjectURL(image)} width={100} height={100} className="w-full h-full object-contain" />
                        </div>
                    }
                    {!bgRemovedImage ?
                        <div className="flex flex-col gap-2 p-2">
                            <label className="text-center" htmlFor="bg-image">Background Removed Image</label>
                            <input id='bg-image' type="file" accept="image/*" onChange={loadBgImage} />

                        </div>
                        : <div className="w-full h-[250px] relative">
                            <X onClick={() => {
                                if (isLoading) return;
                                setBgRemovedImage(null);
                            }} className="absolute top-1 right-2 z-10 cursor-pointer" />
                            <Image alt='bg-image' src={URL.createObjectURL(bgRemovedImage)} width={100} height={100} className="w-full h-full object-contain" />
                        </div>
                    }
                </div>


                <div className="flex justify-end w-10/12 mx-auto">
                    <Button className="border border-white border-opacity-40 p-2 rounded-lg" onClick={upscaleImage}>
                        {isLoading && <Loader2 className="animate-spin" />}
                        Upscale Image</Button>
                </div>
            </div> :

                <div className="w-10/12 mx-auto h-full">
                    <div className="h-[75%] w-10/12 border border-white border-opacity-40 mx-auto mt-4 rounded-lg overflow-hidden">
                        {result && <Image alt='result-image' src={result} width={100} height={100} className="h-full w-full object-contain" />}
                    </div>

                    <div className="flex justify-between mt-4 w-10/12 mx-auto">
                        <Button className="border border-white border-opacity-40 p-2 rounded-lg" onClick={handleReset} >Try new Image</Button>
                        <Button className="border border-white border-opacity-40 p-2 rounded-lg" onClick={handleResult} >Open in new tab</Button>
                    </div>
                </div>}
        </div>
    );
};

export default ImageUpscaler;

