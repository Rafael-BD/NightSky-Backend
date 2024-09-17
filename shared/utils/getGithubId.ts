import { sanitizeInput } from "./sanitizeInput.ts";
import { decrypt } from "./security.ts";

const GITHUB_API_USER_URL = 'https://api.github.com/user';

export async function getGithubUserId(encryptedToken: string): Promise<string> {
    const token = decrypt(encryptedToken);
    const sanitizedToken = sanitizeInput(token);
    const response = await fetch(GITHUB_API_USER_URL, {
        headers: {
            Authorization: `Bearer ${sanitizedToken}`,
        },
    });
    const data = await response.json();

    if(response.status !== 200) {
        console.log(response)
        throw new Error('Error fetching GitHub user ID');
    }
    return data.id;
}