import { NextRequest, NextResponse } from 'next/server';
import { createBitrefillOrder } from '@/lib/bitrefill-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      region,
      amount,
      currency,
      productType = 'mastercard',
      refundAddress,
    } = body;

    // Validate required fields
    if (!region || !amount || !currency || !refundAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: region, amount, currency, refundAddress',
        },
        { status: 400 }
      );
    }

    if (!['EU', 'USA'].includes(region)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Region must be EU or USA',
        },
        { status: 400 }
      );
    }

    console.log('[v0] API: Creating Bitrefill order', {
      region,
      amount,
      currency,
      productType,
      refundAddress: refundAddress.substring(0, 8) + '...',
    });

    // Create order via Bitrefill API
    const result = await createBitrefillOrder(
      region,
      amount,
      currency,
      productType,
      refundAddress
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order: result.order,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[v0] API error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
