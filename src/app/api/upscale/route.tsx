
import Replicate from "replicate";
import { NextResponse } from "next/server";
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

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
        if (output && output[0]) {
            // Get the binary data from the FileOutput
            const response = await fetch(output[0]);
            const arrayBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            const dataUrl = `data:image/webp;base64,${base64Image}`;
            return NextResponse.json({ output: dataUrl });
        }


        return NextResponse.json({ error: "No output received" });
    } catch (error) {
        console.error("Error with Replicate API:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}