import { NextRequest, NextResponse } from "next/server";

import { simulateStrategy } from "@/lib/simulation/simulate";
import type { Decision } from "@/types/simulation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || !Array.isArray(body.decisions)) {
      return NextResponse.json(
        {
          valid: false,
          validationErrors: [
            {
              code: "INVALID_REQUEST",
              message: "Request must contain a decisions array.",
            },
          ],
        },
        { status: 400 }
      );
    }

    const decisions = body.decisions as Decision[];

    const result = simulateStrategy(decisions);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        valid: false,
        validationErrors: [
          {
            code: "INVALID_REQUEST",
            message: "Unable to process simulation request.",
          },
        ],
      },
      { status: 400 }
    );
  }
}