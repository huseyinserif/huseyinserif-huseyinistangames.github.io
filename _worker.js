// Hüseyinistan Games - Cloudflare Worker
// Bu dosya _worker.js olarak repo köküne koyulacak

const PASSWORD_HASH = 'hsnsrf13579';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (url.pathname === '/api/games') {
      if (request.method === 'GET') {
        // Get games list
        const data = await env.GAMES_KV.get('games');
        return new Response(data || '[]', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (request.method === 'POST') {
        // Save games list (admin only)
        const pwd = request.headers.get('X-Admin-Password');
        if (pwd !== PASSWORD_HASH) {
          return new Response(JSON.stringify({error: 'Unauthorized'}), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const body = await request.text();
        await env.GAMES_KV.put('games', body);
        return new Response(JSON.stringify({ok: true}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (url.pathname === '/api/plays' && request.method === 'POST') {
      // Track play count
      const body = await request.json();
      const file = body.file;
      if (!file) return new Response('Bad request', { status: 400 });
      const key = 'plays_' + file;
      const current = parseInt(await env.GAMES_KV.get(key) || '0');
      await env.GAMES_KV.put(key, String(current + 1));
      return new Response(JSON.stringify({ok: true, plays: current + 1}), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/plays' && request.method === 'GET') {
      // Get all play counts
      const keys = await env.GAMES_KV.list({ prefix: 'plays_' });
      const plays = {};
      for (const key of keys.keys) {
        plays[key.name.replace('plays_', '')] = parseInt(await env.GAMES_KV.get(key.name) || '0');
      }
      return new Response(JSON.stringify(plays), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/theme') {
      if (request.method === 'GET') {
        const data = await env.GAMES_KV.get('theme');
        return new Response(data || '{}', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (request.method === 'POST') {
        const pwd = request.headers.get('X-Admin-Password');
        if (pwd !== PASSWORD_HASH) {
          return new Response(JSON.stringify({error: 'Unauthorized'}), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const body = await request.text();
        await env.GAMES_KV.put('theme', body);
        return new Response(JSON.stringify({ok: true}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};
