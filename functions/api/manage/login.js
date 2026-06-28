export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'POST') {
    if (!env.BASIC_USER) {
      return Response.json({ success: false, message: 'Auth is disabled' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    const user = body.user ?? '';
    const pass = body.pass ?? '';
    if (env.BASIC_USER !== user || env.BASIC_PASS !== pass) {
      return Response.json({ success: false, message: '用户名或密码错误' }, { status: 401 });
    }

    const token = btoa(`${user}:${pass}`);
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `admin_auth=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const loginUrl = new URL('/login.html', url.origin);
  const next = url.searchParams.get('next');
  if (next) loginUrl.searchParams.set('next', next);
  return Response.redirect(loginUrl.toString(), 302);
}
