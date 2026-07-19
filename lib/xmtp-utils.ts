import { Client, Conversation, Message, IdentifierKind } from '@xmtp/browser-sdk';
import { Keypair } from 'stellar-sdk';
import { sha256 } from 'js-sha256';
import { Wallet } from 'ethers';

/**
 * Derive a deterministic secp256k1 private key from a Stellar secret key.
 * Flow:
 * 1. Sign a fixed message with the Stellar key (ed25519)
 * 2. Take SHA-256 hash of that signature
 * 3. Use hash as secp256k1 private key seed (deterministic)
 * 4. Return the resulting Ethereum address
 */
export const deriveSecp256k1FromStellar = (
  stellarSecret: string
): { privateKey: string; address: string } => {
  try {
    const keypair = Keypair.fromSecret(stellarSecret);
    const fixedMessage = 'Sign this message to initialize XMTP Chat';

    // Sign the fixed message with Stellar key (ed25519)
    const signature = keypair.sign(Buffer.from(fixedMessage));

    // Hash the signature to get a deterministic seed (SHA-256 produces 32 bytes)
    const hash = sha256.digest(signature);

    // Convert hash to hex string with 0x prefix
    const privateKeyHex =
      '0x' +
      Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Create ethers Wallet from private key to get the address
    const wallet = new Wallet(privateKeyHex);

    return { privateKey: privateKeyHex, address: wallet.address };
  } catch (error) {
    throw new Error(`Failed to derive secp256k1 key from Stellar secret: ${error}`);
  }
};

/**
 * Create an XMTP client from a Stellar secret key
 * Uses deterministic secp256k1 derivation so same Stellar key = same XMTP identity
 * Returns an EOA signer compatible with XMTP Browser SDK v3
 */
export const createXMTPClientFromStellar = async (
  stellarSecret: string
): Promise<{ client: Client; userAddress: string }> => {
  try {
    const { privateKey, address } = deriveSecp256k1FromStellar(stellarSecret);

    // Create an ethers Wallet from the private key for signing
    const wallet = new Wallet(privateKey);

    // Create an EOA signer object compatible with XMTP Browser SDK v3
    const signer = {
      type: 'EOA' as const,
      getIdentifier: () => ({
        identifier: address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }),
      signMessage: async (message: string): Promise<Uint8Array> => {
        // Sign the message with ethers wallet
        const signature = await wallet.signMessage(message);
        // Convert hex string signature to Uint8Array
        return new Uint8Array(Buffer.from(signature.slice(2), 'hex'));
      },
    };

    // Create XMTP client with the EOA signer
    const client = await Client.create(signer, {
      env: 'production', // mainnet
    });

    // Get the user's XMTP address from the client
    const userAddress = client.address;

    return { client, userAddress };
  } catch (error) {
    throw new Error(`Failed to create XMTP client: ${error}`);
  }
};

/**
 * Fetch all conversations for the current user
 */
export const fetchConversations = async (client: Client): Promise<Conversation[]> => {
  try {
    const conversations = await client.conversations.list();
    return conversations;
  } catch (error) {
    throw new Error(`Failed to fetch conversations: ${error}`);
  }
};

/**
 * Fetch messages from a conversation (last N messages)
 */
export const fetchConversationMessages = async (
  conversation: Conversation,
  limit: number = 50
): Promise<Message[]> => {
  try {
    const messages = await conversation.messages({ limit });
    return messages;
  } catch (error) {
    throw new Error(`Failed to fetch messages: ${error}`);
  }
};

/**
 * Send a message to a peer address
 */
export const sendMessage = async (
  client: Client,
  recipientAddress: string,
  text: string
): Promise<Message> => {
  try {
    const conversation = await client.conversations.openOrCreate(recipientAddress);
    const message = await conversation.send(text);
    return message;
  } catch (error) {
    throw new Error(`Failed to send message: ${error}`);
  }
};

/**
 * Stream new messages in a conversation
 */
export const streamConversationMessages = async (
  conversation: Conversation,
  onMessage: (message: Message) => void
): Promise<() => void> => {
  try {
    const unsubscribe = await conversation.streamMessages({
      onMessage,
    });
    return unsubscribe;
  } catch (error) {
    throw new Error(`Failed to stream messages: ${error}`);
  }
};

/**
 * Format XMTP address for display (shorten to first 6 + last 4 chars with 0x prefix)
 */
export const formatXMTPAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format timestamp for display
 */
export const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString();
};
