import { S3 } from "@aws-sdk/client-s3";
import { NextResponse, NextRequest } from "next/server";

const s3 = new S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS || "",
        secretAccessKey: process.env.AWS_ACCESS_SECRET || "",
    },

    region: process.env.AWS_REGION,
});


export async function POST(req: NextRequest) {  // removed unused res parameter
    try {
        if (!process.env.AWS_BUCKET_NAME) {
            return NextResponse.json(
                { error: "AWS bucket configuration is missing" },
                { status: 500 }
            );
        }

        const { key } = await req.json();
        if (!key) {
            return NextResponse.json(
                { error: "Missing key parameter" },
                { status: 400 }
            );
        }

        const data = await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error deleting S3 object:", error);
        return NextResponse.json(
            { error: "Error deleting S3 object" },
            { status: 500 }
        );
    }
}