
import { NextResponse } from "next/server";
import Replicate from "replicate";
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});
export const maxDuration = 60; // Set max duration to 300 seconds (5 minutes)


export async function POST(request: Request) {
    try {

        const { image } = await request.json();

        const output = await replicate.run(
            "recraft-ai/recraft-crisp-upscale",
            {
                input: {
                    "image": image,
                }
            }
        );

        return NextResponse.json({ output: output.toString() });
    } catch (error) {
        console.error("Error with Replicate API:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}