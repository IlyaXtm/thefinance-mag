export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      service: "thefinance-mag-web",
      status: "ok",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
