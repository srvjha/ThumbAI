import { NextRequest, NextResponse, after } from 'next/server';
import { ApiResponse } from '@/utils/ApiResponse';
import { requireUser } from '@/server/auth';
import { enforceRateLimit } from '@/server/rateLimit';
import { apiErrorResponse } from '@/server/errors';
import { screenPrompt } from '@/server/moderation';
import { submitEdit } from '@/server/generations/submit';

export const POST = async (req: NextRequest) => {
  try {
    // The acting user comes from the session. A userId in the body is not a
    // credential and is ignored.
    const user = await requireUser();
    await enforceRateLimit('generate', user.id);
    const body = await req.json();

    // Screened after the response, so moderation never slows a generation.
    // Runs for rejected prompts too: those are often the ones worth seeing.
    let generationId: string | null = null;
    after(() =>
      screenPrompt({
        userId: user.id,
        text: body?.prompt,
        thumbnailId: generationId,
      }),
    );

    const result = await submitEdit(user, body);
    if (result.kind === 'submitted') generationId = result.generationId;

    if (result.kind === 'rejected') {
      return NextResponse.json(
        new ApiResponse(200, result.prompt, result.message),
      );
    }

    const { kind: _kind, ...data } = result;
    return NextResponse.json(
      new ApiResponse(
        200,
        { valid_prompt: true, success: true, ...data },
        'Request Submitted Successfully',
      ),
      { status: 200 },
    );
  } catch (error) {
    console.error('Edit API error:', error);
    return apiErrorResponse(error);
  }
};
