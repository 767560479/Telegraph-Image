export function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}

export async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
    const MAX_RETRIES = 2;
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

    try {
        const response = await fetch(apiUrl, { method: "POST", body: formData });
        const responseData = await response.json();

        if (response.ok) {
            return { success: true, data: responseData };
        }

        if (retryCount < MAX_RETRIES && apiEndpoint === 'sendPhoto') {
            console.log('Retrying image as document...');
            const newFormData = new FormData();
            newFormData.append('chat_id', formData.get('chat_id'));
            newFormData.append('document', formData.get('photo'));
            return await sendToTelegram(newFormData, 'sendDocument', env, retryCount + 1);
        }

        return {
            success: false,
            error: responseData.description || 'Upload to Telegram failed'
        };
    } catch (error) {
        console.error('Network error:', error);
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await sendToTelegram(formData, apiEndpoint, env, retryCount + 1);
        }
        return { success: false, error: 'Network error occurred' };
    }
}

export async function uploadBlobToTelegram({ blob, fileName, env }) {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const mimeType = blob.type || '';

    const telegramFormData = new FormData();
    telegramFormData.append("chat_id", env.TG_Chat_ID);

    let apiEndpoint;
    if (mimeType.startsWith('image/')) {
        telegramFormData.append("photo", blob, fileName);
        apiEndpoint = 'sendPhoto';
    } else if (mimeType.startsWith('audio/')) {
        telegramFormData.append("audio", blob, fileName);
        apiEndpoint = 'sendAudio';
    } else if (mimeType.startsWith('video/')) {
        telegramFormData.append("video", blob, fileName);
        apiEndpoint = 'sendVideo';
    } else {
        telegramFormData.append("document", blob, fileName);
        apiEndpoint = 'sendDocument';
    }

    const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

    if (!result.success) {
        throw new Error(result.error);
    }

    const fileId = getFileId(result.data);
    if (!fileId) {
        throw new Error('Failed to get file ID');
    }

    if (env.img_url) {
        await env.img_url.put(`${fileId}.${fileExtension}`, "", {
            metadata: {
                TimeStamp: Date.now(),
                ListType: "None",
                Label: "None",
                liked: false,
                fileName: fileName,
                fileSize: blob.size,
            }
        });
    }

    return { src: `/file/${fileId}.${fileExtension}` };
}
