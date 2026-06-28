export async function onRequest(context) {
  const url = new URL(context.request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `admin_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
      'Cache-Control': 'no-store',
    },
  });
}
