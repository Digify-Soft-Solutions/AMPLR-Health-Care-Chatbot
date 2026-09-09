const BACKEND_PORT = process.env.BACKEND_PORT || process.env.PORT || '5000';

export async function GET(request, { params }) {
  const { path: pathSegments } = await params;
  const targetPath = pathSegments.join('/');
  const url = new URL(request.url);
  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}/api/${targetPath}${url.search}`;

  try {
    const res = await fetch(targetUrl);
    const contentType = res.headers.get('content-type') || 'application/json';
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request, { params }) {
  const { path: pathSegments } = await params;
  const targetPath = pathSegments.join('/');
  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}/api/${targetPath}`;
  const body = await request.text();

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
    });
    const responseBody = await res.arrayBuffer();
    return new Response(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': response.headers ? res.headers.get('content-type') || 'application/json' : 'application/json',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(request, { params }) {
  const { path: pathSegments } = await params;
  const targetPath = pathSegments.join('/');
  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}/api/${targetPath}`;
  const body = await request.text();

  try {
    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
    });
    const responseBody = await res.arrayBuffer();
    return new Response(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request, { params }) {
  const { path: pathSegments } = await params;
  const targetPath = pathSegments.join('/');
  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}/api/${targetPath}`;

  try {
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
    });
    const responseBody = await res.arrayBuffer();
    return new Response(responseBody, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
