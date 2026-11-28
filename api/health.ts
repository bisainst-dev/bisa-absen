// Vercel Serverless Function - Health Check Endpoint
export default function handler(_req: { method?: string }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  res.status(200).json({
    status: 'ok',
    app: 'BISA Absen API (Vercel Serverless)',
    timestamp: Date.now(),
  });
}
