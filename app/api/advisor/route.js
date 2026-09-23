import { adviseDistrict } from '../../../../lib/ai/analyst.js';

export async function POST(request) {
  try {
    const { district } = await request.json();
    const advice = await adviseDistrict(district);
    return Response.json({ advice });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to analyze the district.' },
      { status: error?.status || 500 },
    );
  }
}
