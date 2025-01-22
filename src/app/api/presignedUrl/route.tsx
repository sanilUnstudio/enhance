import { S3, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const s3 = new S3({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS || "",
        secretAccessKey: process.env.AWS_ACCESS_SECRET || "",
    },

    region: process.env.AWS_REGION,
});

export async function POST(req) {
    const { fileType, key } = await req.json();

    if (!fileType) {
        return res.status(400).json({ error: "Missing fileName or fileType" });
    }

    try {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 3600, // URL expiration time in seconds
        });

        return NextResponse.json({ uploadUrl });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        return NextResponse.json(
            { error: "Error generating presigned URL" },
            { status: 500 }
        );
    }
}
