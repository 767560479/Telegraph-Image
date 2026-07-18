import { uploadBlobToTelegram } from "../../utils/telegramUpload";

const MAX_LIST_SIZE = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const MIME_TO_EXT = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

export function parseDataUri(item, index) {
    if (typeof item !== "string") {
        throw new Error(`list[${index}] must be a data URI string`);
    }

    const match = item.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        throw new Error(`list[${index}] is not a valid data URI`);
    }

    const mimeType = match[1].toLowerCase();
    if (!mimeType.startsWith("image/")) {
        throw new Error(`list[${index}] must be an image data URI`);
    }

    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
        throw new Error(`list[${index}] unsupported image type: ${mimeType}`);
    }

    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_FILE_SIZE) {
        throw new Error(`list[${index}] exceeds 20MB limit`);
    }

    return {
        blob: new Blob([bytes], { type: mimeType }),
        fileName: `upload.${ext}`,
    };
}

export async function onRequestPost(context) {
    const { request, env } = context;

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
        return jsonResponse({ success: false, error: "Content-Type must be application/json" }, 400);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    if (!body || !Array.isArray(body.list)) {
        return jsonResponse({ success: false, error: "Body must contain a list array" }, 400);
    }

    if (body.list.length === 0) {
        return jsonResponse({ success: false, error: "list must not be empty" }, 400);
    }

    if (body.list.length > MAX_LIST_SIZE) {
        return jsonResponse({ success: false, error: `list must not exceed ${MAX_LIST_SIZE} items` }, 400);
    }

    const origin = new URL(request.url).origin;
    const results = [];

    try {
        for (let i = 0; i < body.list.length; i++) {
            const { blob, fileName } = parseDataUri(body.list[i], i);
            const { src } = await uploadBlobToTelegram({ blob, fileName, env });
            results.push(`${origin}${src}`);
        }
    } catch (error) {
        console.error("Base64 upload error:", error);
        const status = error.message.startsWith("list[") ? 400 : 500;
        return jsonResponse({ success: false, error: error.message }, status);
    }

    return jsonResponse({ success: true, result: results });
}

export async function onRequest(context) {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
}
