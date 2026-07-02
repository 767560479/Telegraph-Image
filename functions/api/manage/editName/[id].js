export async function onRequest(context) {
    const { params, env, request } = context;

    console.log("Request ID:", params.id);

    const url = new URL(request.url);
    const newName = url.searchParams.get('newName')?.trim();

    if (!newName) {
        return new Response(JSON.stringify({ success: false, error: '文件名不能为空' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (newName.length > 64) {
        return new Response(JSON.stringify({ success: false, error: '文件名不能超过64个字符' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 获取元数据
    let value = await env.img_url.getWithMetadata(params.id);
    console.log("Current metadata:", value);

    if (!value || (value.value === null && !value.metadata)) {
        return new Response(JSON.stringify({ success: false, error: `Image not found for ID: ${params.id}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!value.metadata) {
        value.metadata = {
            ListType: "None",
            Label: "None",
            TimeStamp: Date.now(),
            liked: false,
            fileName: params.id,
            fileSize: 0,
        };
    }

    // 更新文件名
    value.metadata.fileName = newName;
    await env.img_url.put(params.id, "", { metadata: value.metadata });

    console.log("Updated metadata:", value.metadata);

    return new Response(JSON.stringify({ success: true, fileName: value.metadata.fileName }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
