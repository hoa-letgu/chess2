// Production entry point for an HTTPS reverse proxy / Cloudflare Tunnel.
process.env.NODE_ENV='production';
process.env.ARENA_SERVE_UI='1';
process.env.HOST??='127.0.0.1';
process.env.PORT??='8080';
await import('./server.js');
