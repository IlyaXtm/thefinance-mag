/**
 * Health check at /mag/health (basePath applies).
 * Used by the container healthcheck and by the staging parallel run.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    source: process.env.NEXT_PUBLIC_USE_MOCK === 'true' ? 'mock' : 'wpgraphql',
    time: new Date().toISOString(),
  });
}
