// pages/api/health.js hoặc app/api/health/route.js
export async function GET() {
  return Response.json(
    { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'CAD Frontend',
      version: process.env.npm_package_version || '1.0.0'
    },
    { status: 200 }
  );
}
