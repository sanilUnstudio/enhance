"use client"
import React, { useState, useRef } from "react";
import { fabric } from "fabric";
import axios from "axios";
import Replicate from "replicate";


const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const resizeImageWBg = async ({ file, targetWidth, targetHeight }) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const base = e.target.result;
            const fabricCanvas = new fabric.Canvas("canvas", {
                width: 1024,
                height: 1024,
            });

            fabric.Image.fromURL(base, (fabricImage) => {
                fabricCanvas.add(fabricImage);

                // Resize image to target dimensions
                fabricCanvas.setWidth(targetWidth);
                fabricCanvas.setHeight(targetHeight);

                fabricImage.set({
                    scaleX: targetWidth / fabricImage.width,
                    scaleY: targetHeight / fabricImage.height,
                });

                // Render and return base64
                fabricCanvas.renderAll();
                const maskData = fabricCanvas.toDataURL({
                    format: "png",
                });

                // Convert the image to grayscale
                const grayscaleCanvas = document.createElement("canvas");
                grayscaleCanvas.width = fabricCanvas.width;
                grayscaleCanvas.height = fabricCanvas.height;
                const ctx = grayscaleCanvas.getContext("2d");
                const tempImage = new Image();

                tempImage.onload = () => {
                    ctx.drawImage(tempImage, 0, 0);
                    const imageData = ctx.getImageData(0, 0, grayscaleCanvas.width, grayscaleCanvas.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const grayscale = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                        const binary = grayscale > 0 ? 255 : 0; // Threshold for binary mask
                        data[i] = binary; // Red
                        data[i + 1] = binary; // Green
                        data[i + 2] = binary; // Blue
                        data[i + 3] = 255; // Alpha (Fully opaque)
                    }

                    ctx.putImageData(imageData, 0, 0);
                    const maskBase64 = grayscaleCanvas.toDataURL("image/png");

                    // Clean up
                    fabricCanvas.dispose();
                    grayscaleCanvas.remove();

                    resolve(maskBase64);
                };
                tempImage.src = maskData;
            });
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};


const resizeImage = async (file, scale) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const base = e.target.result;
            const fabricCanvas = new fabric.Canvas("canvas", {
                width: 1024,
                height: 1024,
            });

            fabric.Image.fromURL(base, (fabricImage) => {
                fabricCanvas.add(fabricImage);

                // Original dimensions
                const originalWidth = fabricImage.width;
                const originalHeight = fabricImage.height;

                // New dimensions
                const newWidth = originalWidth * scale;
                const newHeight = originalHeight * scale;

                // Resize canvas and image
                fabricCanvas.setWidth(newWidth);
                fabricCanvas.setHeight(newHeight);

                fabricImage.set({
                    scaleX: newWidth / originalWidth,
                    scaleY: newHeight / originalHeight,
                });

                // Render and return base64
                fabricCanvas.renderAll();
                const maskData = fabricCanvas.toDataURL({
                    format: "png",
                });

                resolve({ maskData, newHeight, newWidth });
            });
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};




const ImageUpscaler = () => {
    const [image, setImage] = useState(null);
    const [bgRemovedImage, setBgRemovedImage] = useState(null);
    const [scale, setScale] = useState(2);
    const [newHeight, setNewHeight] = useState(1024);
    const [newWidth, setNewWidth] = useState(1024);

    // Load an image onto the canvas
    const loadImage = async (event) => {
        const file = event.target.files[0];
        const { maskData, newHeight, newWidth } = await resizeImage(file, scale);
        setImage(maskData);
        setNewHeight(newHeight);
        setNewWidth(newWidth);
    };

    const loadBgImage = async (event) => {
        const file = event.target.files[0];
        const updatedbase = await resizeImageWBg({ file, targetHeight: newHeight, targetWidth: newWidth });

        setBgRemovedImage(updatedbase);
    };



    // Send the images to the backend for upscaling
    const upscaleImage = async () => {
        if (!image || !bgRemovedImage) {
            alert("Please load an image and generate a mask first.");
            return;
        }

        try {
            console.log("input", {
                mask: bgRemovedImage,
                image: image,
                scale
            });
            const output = await replicate.run(
                "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e",
                {
                    input: {
                        "mask": bgRemovedImage,
                        seed: 1337,
                        image: image,
                        prompt: "masterpiece, best quality, highres, <lora:more_details:0.5> <lora:SDXLrender_v2.0:1>",
                        dynamic: 6,
                        scheduler: "DPM++ 3M SDE Karras",
                        creativity: 0.35,
                        resemblance: 0.6,
                        scale_factor: scale,
                        negative_prompt: "(worst quality, low quality, normal quality:2) JuggernautNegative-neg",
                        num_inference_steps: 18
                    }
                }
            );
            console.log("output",output)

        } catch (error) {
            console.error("Upscaling failed:", error);
        }
    };

    return (
        <div>
            <h1 className="text-center text-2xl">Image Upscaler</h1>

            <div className="flex flex-col gap-2 justify-center items-center">
                <label htmlFor="scale-value">Add Scale value</label>
                <input id='scale-value' className="text-black w-20" type="text" placeholder="Add Scale value" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
            </div>


            <div className="grid grid-cols-2 w-10/12 mx-auto h-[250px] border border-white border-opacity-40 rounded-lg mt-10 overflow-hidden">
                {!image ?
                    <div className="flex flex-col gap-2  border-r p-2 border-white border-opacity-40">
                        <label className="text-center" htmlFor="original-image">Original Image</label>
                        <input id='original-image' type="file" accept="image/*" onChange={loadImage} />
                    </div>
                    : <div className="w-full h-[250px] ">
                        <img src={image} className="w-full h-full object-contain" />
                    </div>
                }
                {!bgRemovedImage ?
                    <div className="flex flex-col gap-2 p-2">
                        <label className="text-center" htmlFor="bg-image">Background Removed Image</label>
                        <input disabled={!image} id='bg-image' type="file" accept="image/*" onChange={loadBgImage} />

                    </div>
                    : <div className="w-full h-[250px]">
                        <img src={bgRemovedImage} className="w-full h-full object-contain" />
                    </div>
                }
            </div>


            <div className="flex justify-end mt-4">
                <button className="border border-white border-opacity-40 p-2 rounded-lg mr-16" onClick={upscaleImage}>Upscale Image</button>
            </div>
        </div>
    );
};

export default ImageUpscaler;
