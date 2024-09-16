import { supabaseSvc as supabase } from "../../../shared/utils/supabaseClient.ts";
import {decrypt} from "../../../shared/utils/security.ts";
import { sanitizeInput } from "../../../shared/utils/sanitizeInput.ts";
import { getGithubUserId } from "./authService.ts";
import areValidCategories from "../utils/validateCategories.ts";

const GITHUB_API_USER_URL = 'https://api.github.com/user';
const GITHUB_API_REPOS_URL = 'https://api.github.com/search/repositories?q=user:';

async function getStoreUUID(encryptedToken: string): Promise<string> {
    try {
        const githubId = await getGithubUserId(encryptedToken);
        const { data, error } = await supabase
            .from('stores')
            .select('user_id')
            .eq('github_id', githubId);

        if (error) throw new Error('Error fetching store UUID');
        if (data.length === 0) throw new Error('Store not found');

        return data[0].user_id;
    } catch (error) {
        console.error(error.message);
        return '';
    }
}

async function checkIfRepoExists(repoId: string): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('plugins')
            .select('repo_id', { count: 'exact' })
            .eq('repo_id', repoId);

        if (error) throw new Error('Error checking if repo exists');
        return (count ?? 0) > 0;
    } catch (error) {
        console.error(error.message);
        return false;
    }
}

async function getRepoUrl(repoId: string, githubAccessToken: string): Promise<string> {
    try {
        const userRepositories = await fetchStorePluginsSvc(githubAccessToken);
        // deno-lint-ignore no-explicit-any
        const repo = userRepositories.find((r: any) => r.id === repoId);

        if (!repo) throw new Error('Repository not found');
        return repo.html_url;
    } catch (error) {
        console.error(error.message);
        return '';
    }
}

async function validateRepoOwnership(repoId: string, githubAccessToken: string): Promise<boolean> {
    try {
        const userRepositories = await fetchStorePluginsSvc(githubAccessToken);
        // deno-lint-ignore no-explicit-any
        return userRepositories.some((r: any) => r.id === repoId);
    } catch (error) {
        console.error(error.message);
        return false;
    }
}

export const getUserReposSvc = async (githubAccessToken: string) => {
    const decryptedToken = decrypt(githubAccessToken);
    const sanitizedToken = sanitizeInput(decryptedToken);

    const response = await fetch(GITHUB_API_USER_URL, {
        headers: {
            Authorization: `token ${sanitizedToken}`,
        },
    });
    const user = await response.json();
    const reposResponse = await fetch(`${GITHUB_API_REPOS_URL}${user.login}`, {
        headers: {
            Authorization: `token ${sanitizedToken}`,
        },
    });
    const repos = await reposResponse.json();
    return repos.items;
};

export const fetchStorePluginsSvc = async (githubAccessToken: string) => {
    const uuid = await getStoreUUID(githubAccessToken);
    const { data, error } = await supabase
        .from('plugins')
        .select('*')
        .eq('owner', uuid);

    if(error) {
        console.error('Error fetching store plugins:', error);
        return [];
    }
    return data;
};

export const createPluginSvc = async (githubAccessToken: string, name: string, repoId: string, categories: string[], branch: string): Promise<boolean> => {
    const [exists, validOwnership, isCategoriesValid] = await Promise.all([
        checkIfRepoExists(repoId),
        validateRepoOwnership(repoId, githubAccessToken),
        Promise.resolve(areValidCategories(categories))
    ]);

    if (exists || !validOwnership || !isCategoriesValid) return false;

    const [uuid, repoUrl] = await Promise.all([
        getStoreUUID(githubAccessToken),
        getRepoUrl(repoId, githubAccessToken)
    ]);

    const { error } = await supabase
        .from('plugins')
        .insert([{ plugin_name: name, repo_id: repoId, owner: uuid, categories, repo_url: repoUrl, branch }])
    
    if(error) {
        console.error('Error creating plugin:', error);
    }
    return !error;
};

export const updatePluginSvc = async (githubAccessToken: string, name: string, repoId: string, categories: string[], branch: string): Promise<boolean> => {
    const [exists, validOwnership, isCategoriesValid] = await Promise.all([
        checkIfRepoExists(repoId),
        validateRepoOwnership(repoId, githubAccessToken),
        Promise.resolve(areValidCategories(categories))
    ]);

    if (!exists || !validOwnership || !isCategoriesValid) return false;
    const updateTimestampz = new Date().toISOString();

    const { error } = await supabase
        .from('plugins')
        .update({ plugin_name: name, categories, branch, updated_at: updateTimestampz })
        .eq('repo_id', repoId);

    if(error) {
        console.error('Error updating plugin:', error);
    }
    return !error;
};

export const deletePluginSvc = async (githubAccessToken: string, repoId: string): Promise<boolean> => {
    const [exists, validOwnership] = await Promise.all([
        checkIfRepoExists(repoId),
        validateRepoOwnership(repoId, githubAccessToken)
    ]);

    if (!exists || !validOwnership) return false;

    const { error } = await supabase
        .from('plugins')
        .delete()
        .eq('repo_id', repoId);

    if(error) {
        console.error('Error deleting plugin:', error);
    }
    return !error;
};