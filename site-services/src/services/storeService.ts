import { supabaseSvc as supabase } from "../../../shared/utils/supabaseClient.ts";

export async function checkIfExists(encryptedToken: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('github_access_token')
            .eq('github_access_token', encryptedToken);

        if (error) throw error;
        console.log('Data:', data);
        return data !== null && data.length > 0;
    } catch (error) {
        console.error('Error validating GitHub token:', error);
        return false;
    }
}

export async function createStoreInDB(encryptedToken: string, accountName: string): Promise<boolean> {
    try {
        const exists = await checkIfExists(encryptedToken);
        if (exists) return false;
    
        const { status, error } = await supabase
            .from('stores')
            .insert([{ github_access_token: encryptedToken, name: accountName }]);

        if (error) throw error;
        return status === 201;
    } catch (error) {
        console.error('Error creating user:', error);
        return false;
    }
}

export async function updateAccount(accountName: string, encryptedToken: string, id: string): Promise<boolean> {
    try {
        const { status, error } = await supabase
            .from('stores')
            .update({ name: accountName })
            .eq('user_id', id)
            .eq('github_access_token', encryptedToken);

        if (error) throw error;
        
        return status === 204;
    } catch (error) {
        console.error('Error updating account name:', error);
        return false;
    }
}

export async function deleteAccountInDB(encryptedToken: string, id: string): Promise<boolean> {
    try {
        const { data, error: selectError } = await supabase
            .from('stores')
            .select('user_id')
            .eq('user_id', id)
            .eq('github_access_token', encryptedToken);

        if (selectError) throw selectError;
        if (data === null || data.length === 0) {
            return false;
        }

        const { status, error: deleteError } = await supabase
            .from('stores')
            .delete()
            .eq('github_access_token', encryptedToken);

        if (deleteError) throw deleteError;
        return status === 204;
    } catch (error) {
        console.error('Error deleting account:', error);
        return false;
    }
}