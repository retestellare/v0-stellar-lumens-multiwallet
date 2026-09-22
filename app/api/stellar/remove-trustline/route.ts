import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { assetCode, assetIssuer, userPublicKey } = await request.json();

    if (!assetCode || !assetIssuer || !userPublicKey) {
      return NextResponse.json(
        { error: 'Missing required fields: assetCode, assetIssuer, or userPublicKey.' },
        { status: 400 }
      );
    }

    const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
    const account = await server.loadAccount(userPublicKey);
    const asset = new StellarSdk.Asset(assetCode, assetIssuer);

    // Build the transaction setting the limit to "0" to remove the trustline
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.PUBLIC,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: asset,
          limit: "0",
        })
      )
      .setTimeout(180)
      .build();

    const xdr = transaction.toXDR();

    return NextResponse.json({ success: true, xdr });
  } catch (error: any) {
    console.error("Stellar backend error:", error);
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Unknown error occurred';
    if (error.response?.status === 404) {
      errorMessage = 'Account not found on the network';
    } else if (error.response?.data?.extras) {
      errorMessage = JSON.stringify(error.response.data.extras);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
