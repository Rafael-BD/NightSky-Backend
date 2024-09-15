import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";


const privateKey = Deno.env.get('PRIVATE_KEY')!;

export function decryptToken(encryptedToken: string): string {
    const buffer = Buffer.from(encryptedToken, 'base64');
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        buffer
    );
    return decrypted.toString('utf8');
}

