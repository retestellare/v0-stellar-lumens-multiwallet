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

    // @ts-ignore
    const HorizonServer = StellarSdk.Horizon?.Server || StellarSdk.Server;
    // @ts-ignore
    const AssetFactory = StellarSdk.Asset;
    // @ts-ignore
    const TransactionBuilderFactory = StellarSdk.TransactionBuilder;
    // @ts-ignore
    const NetworksPassphrase = StellarSdk.Networks?.PUBLIC || 'Public Global Stellar Network ; October 2015';
    // @ts-ignore
    const BaseFee = StellarSdk.BASE_FEE || 100;

    const server = new HorizonServer("https://horizon.stellar.org"); 
    
    // Load the actual account from the network to get the correct current sequence number
    const account = await server.loadAccount(userPublicKey);
    const asset = new AssetFactory(assetCode, assetIssuer);

    console.log('[v0] Building trustline removal transaction:', {
      assetCode,
      assetIssuer,
      userPublicKey,
      limit: "0"
    });

    // Build the transaction setting the limit to "0" to remove the trustline
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
      .setTimeout(180)
      .build();

    console.log('[v0] Transaction built successfully');

    // Return the transaction XDR as a base64 string that can be reconstructed with TransactionBuilder.fromXDR()
    const xdr = transaction.toXDR();

    console.log('[v0] Transaction XDR created');

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
