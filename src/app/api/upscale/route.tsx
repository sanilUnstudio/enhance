
import Replicate from "replicate";
import { NextResponse } from "next/server";
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});
export const maxDuration = 60; // Set max duration to 300 seconds (5 minutes)


export async function POST(request: Request) {
    try {

        const { mask,
            image,
            scale, } = await request.json();



        const output = await replicate.run(
            "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e",
            {
                input: {
                    "mask": mask,
                    "seed": 1188,
                    "image": image,
                    "prompt": "masterpiece, best quality, highres, <lora:more_details:0.5> <lora:SDXLrender_v2.0:1>",
                    "dynamic": 6,
                    "handfix": "disabled",
                    "pattern": false,
                    "sharpen": 0,
                    "sd_model": "juggernaut_reborn.safetensors [338b85bc4f]",
                    "scheduler": "DPM++ 3M SDE Karras",
                    "creativity": 0.35,
                    "lora_links": "",
                    "downscaling": true,
                    "resemblance": 0.6,
                    "scale_factor": scale,
                    "tiling_width": 112,
                    "output_format": "png",
                    "tiling_height": 144,
                    "custom_sd_model": "",
                    "negative_prompt": "(worst quality, low quality, normal quality:2) JuggernautNegative-neg",
                    "num_inference_steps": 18,
                    "downscaling_resolution": 768
                }
            }
        );

        return NextResponse.json({ output: output[0].toString() });
    } catch (error) {
        console.error("Error with Replicate API:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}