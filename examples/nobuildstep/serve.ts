// ONLY FOR USE IN DEVELOPMENT. The path resolution doesnt sanitize the path from the browsers url.
const server = Bun.serve({
  port: 3789,
  async fetch(request, server) {
    const url = new URL(request.url);
    const path = `./src${url.pathname === "/" ? "/index.html" : url.pathname}`;
    const file = Bun.file(path);


    if (await file.exists()) return new Response(file, { headers });
    return new Response("Not found", { status: 404, headers });
  },
});

const headers = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

console.log(`Serving ./src at http://localhost:${server.port}`);
