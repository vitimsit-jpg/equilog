export const dynamic = "force-dynamic";

export async function GET() {
  throw new Error("Sentry test error — équilog prod");
}
