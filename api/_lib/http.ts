/**
 * Node.js Fluid Compute on Vercel expects a Web Standard fetch export:
 *   export default { fetch(request: Request) { return new Response(...) } }
 * Named OPTIONS/GET/POST keep preflight from hanging on a default Node req/res handler.
 */

type ApiHandler = (req: Request) => Response | Promise<Response>;

export function exposeApi(handle: ApiHandler) {
  const fetch = (req: Request) => Promise.resolve(handle(req));
  return {
    fetch,
    OPTIONS: fetch,
    GET: fetch,
    HEAD: fetch,
    POST: fetch,
  };
}
