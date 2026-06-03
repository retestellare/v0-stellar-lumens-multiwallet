import { NextResponse } from 'next/server';
import StellarSdk from 'stellar-sdk';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { assetCode, assetIssuer, userSecretKey } = await request.json();

    if (!assetCode || !assetIssuer || !userSecretKey) {
      return NextResponse.json(
        { error: 'Missing required fields: assetCode, assetIssuer, or userSecretKey.' },
        { status: 400 }
      );
    }

    const server = new StellarSdk.Horizon.Server("https://stellar.org"); 
    const sourceKeypair = StellarSdk.Keypair.fromSecret(userSecretKey);
    const account = await server.loadAccount(sourceKeypair.publicKey());
    const asset = new StellarSdk.Asset(assetCode, assetIssuer);

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
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    return NextResponse.json({ success: true, hash: result.hash });
  } catch (error: any) {
    console.error("Stellar backend error:", error);
    return NextResponse.json(
      { error: error.message || error.toString() },
      { status: 500 }
    );
  }
}
