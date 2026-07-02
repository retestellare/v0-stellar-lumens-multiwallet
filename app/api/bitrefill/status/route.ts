import { NextRequest, NextResponse } from 'next/server';
import { getBitrefillOrderStatus } from '@/lib/bitrefill-utils';

/**
 * Check the status of a Bitrefill order
 * GET /api/bitrefill/status?orderId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing orderId parameter' },
        { status: 400 }
      );
    }

    console.log('[v0] API: Checking order status:', orderId);

    const result = await getBitrefillOrderStatus(orderId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order: result.order,
        cardDetails: result.cardDetails,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] API error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
