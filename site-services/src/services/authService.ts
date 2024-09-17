import { supabaseSvc as supabase } from "../../../shared/utils/supabaseClient.ts";
import { getGithubUserId } from "../../../shared/utils/getGithubId.ts"

export async function checkIfExists(encryptedToken: string): Promise<boolean> {
    const userID = await getGithubUserId(encryptedToken);
    try {
        const { count, error } = await supabase
            .from('stores')
            .select('github_id', { count: 'exact' })
            .eq('github_id', userID);

        if (error) throw error;
        return (count ?? 0) > 0;
    } catch (error) {
        console.error('Error validating GitHub token:', error);
        return false;
    }
}

export async function checkIfNameExists(accountName: string): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('stores')
            .select('name', { count: 'exact' })
            .eq('name', accountName);

        if (error) throw error;
        return (count ?? 0) > 0;
    } catch (error) {
        console.error('Error validating account name:', error);
        return false;
    }
}

export async function createStoreInDB(encryptedToken: string, accountName: string): Promise<boolean> {
    try {
        const exists = await checkIfExists(encryptedToken);
        if (exists) return false;

        let name = accountName;
        const nameExists = await checkIfNameExists(accountName);
        if (nameExists){
            name = name + Math.floor(Math.random() * 1000);
        }

        const id = await getGithubUserId(encryptedToken);

        const { status, error } = await supabase
            .from('stores')
            .insert([{ github_id: id, name: name}]);

        if (error) throw error;
        return status === 201;
    } catch (error) {
        console.error('Error creating user:', error);
        return false;
    }
}

export async function updateAccount(accountName: string, encryptedToken: string, email: string): Promise<boolean> {
    const exists = await checkIfExists(encryptedToken);
    if (!exists) return false;
    const id = await getGithubUserId(encryptedToken);

    try {
        const nameExists = await checkIfNameExists(accountName);
        if (nameExists) return false;

        const { status, error } = await supabase
            .from('stores')
            .update({ name: name, email: email })
            .eq('github_id', id)

        if (error) throw error;
        
        return status === 204;
    } catch (error) {
        console.error('Error updating account name:', error);
        return false;
    }
}

export async function deleteAccountInDB(encryptedToken: string): Promise<boolean> {
    const id = await getGithubUserId(encryptedToken);

    try {
        const { status, error: deleteError } = await supabase
            .from('stores')
            .delete()
            .eq('github_id', id);

        if (deleteError) throw deleteError;
        return status === 204;
    } catch (error) {
        console.error('Error deleting account:', error);
        return false;
    }
}