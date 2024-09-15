import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";


const privateKey = Deno.env.get('PRIVATE_KEY')?.replace(/\\n/g, '\n')!;

export function decrypt(encryptedToken: string): string {
    const buffer = Buffer.from(encryptedToken, 'base64');
    const decrypted = crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        buffer
    );
    const decoded = new TextDecoder('utf-8').decode(decrypted);
    return decoded;
}

