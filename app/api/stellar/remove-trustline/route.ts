import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

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

    // @ts-ignore
    const HorizonServer = StellarSdk.Horizon?.Server || StellarSdk.Server;
    // @ts-ignore
    const KeypairFactory = StellarSdk.Keypair;
    // @ts-ignore
    const AssetFactory = StellarSdk.Asset;
    // @ts-ignore
    const TransactionBuilderFactory = StellarSdk.TransactionBuilder;
    // @ts-ignore
    const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
    // @ts-ignore
    const BaseFee = StellarSdk.BASE_FEE || 100;

    const server = new HorizonServer("https://stellar.org"); 
    const sourceKeypair = KeypairFactory.fromSecret(userSecretKey);
    const account = await server.loadAccount(sourceKeypair.publicKey());
    const asset = new AssetFactory(assetCode, assetIssuer);

    const transaction = new TransactionBuilderFactory(account, {
      fee: BaseFee,
      networkPassphrase: NetworksPassphrase,
    })
      .addOperation(
        // @ts-ignore
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
