import { NextResponse } from 'next/server';
import StellarSdk from 'stellar-sdk';

export async function POST(request: Request) {
  try {
    const { assetCode, assetIssuer, userSecretKey } = await request.json();

    if (!assetCode || !assetIssuer || !userSecretKey) {
      return NextResponse.json(
        { error: 'Parametri mancanti: assetCode, assetIssuer o userSecretKey richiesti.' },
        { status: 400 }
      );
    }

    // Inizializza il server di Stellar (Rete pubblica)
    const server = new StellarSdk.Horizon.Server("https://stellar.org"); 
    
    // Genera la coppia di chiavi dalla chiave segreta dell'utente
    const sourceKeypair = StellarSdk.Keypair.fromSecret(userSecretKey);
    const account = await server.loadAccount(sourceKeypair.publicKey());

    // Configura l'asset (se è un token personalizzato usa alphanumeric, non native)
    const asset = new StellarSdk.Asset(assetCode, assetIssuer);

    // Costruisce la transazione impostando il limite a "0" per eliminare la trustline
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

    // Firma e invia la transazione sulla rete Stellar
    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    return NextResponse.json({ success: true, hash: result.hash });
  } catch (error: any) {
    console.error("Errore Stellar:", error);
    return NextResponse.json(
      { error: error.message || error.toString() },
      { status: 500 }
    );
  }
}
