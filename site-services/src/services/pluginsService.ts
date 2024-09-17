import { Plugin, Repo } from './../../../shared/types.ts';
import { supabaseSvc as supabase } from "../../../shared/utils/supabaseClient.ts";
import { decrypt } from "../../../shared/utils/security.ts";
import { sanitizeInput } from "../../../shared/utils/sanitizeInput.ts";
import { getGithubUserId } from "./authService.ts";
import areValidCategories from "../utils/validateCategories.ts";

const GITHUB_API_USER_URL = 'https://api.github.com/user';
const GITHUB_API_REPOS_URL = 'https://api.github.com/search/repositories?q=user:';

import { PostgrestError } from "npm:@supabase/supabase-js@2.45.4";

const handleSupabaseError = (error: PostgrestError | null, message: string) => {
    if (error) {
        console.error(message, error);
        return true;
    }
    return false;
};

const getStoreUUID = async (encryptedToken: string): Promise<string> => {
    try {
        const githubId = await getGithubUserId(encryptedToken);
        const { data, error } = await supabase
            .from('stores')
            .select('user_id')
            .eq('github_id', githubId);

        if (handleSupabaseError(error, 'Error fetching store UUID')) return '';
        if (!data || data.length === 0) throw new Error('Store not found');

        return data[0].user_id;
    } catch (error) {
        console.error(error.message);
        return '';
    }
};

const checkIfRepoExists = async (repoId: string): Promise<boolean> => {
    try {
        const { count, error } = await supabase
            .from('plugins')
            .select('repo_id', { count: 'exact' })
            .eq('repo_id', repoId);

        if (handleSupabaseError(error, 'Error checking if repo exists')) return false;
        return (count ?? 0) > 0;
    } catch (error) {
        console.error(error.message);
        return false;
    }
};

const getRepoUrl = async (repoId: string, githubAccessToken: string): Promise<string> => {
    try {
        const userRepositories = await getUserReposSvc(githubAccessToken);
        const repo = userRepositories.find((r: Repo) => r.id.toString() === repoId.toString());

        if (!repo) throw new Error('Repository not found');
        return repo.html_url;
    } catch (error) {
        console.error(error.message);
        return '';
    }
};

const validateRepoOwnership = async (repoId: string, githubAccessToken: string): Promise<boolean> => {
    try {
        const userRepositories = await getUserReposSvc(githubAccessToken);
        return userRepositories.some((r: Repo) => r.id.toString() === repoId.toString());
    } catch (error) {
        console.error(error.message);
        return false;
    }
};

const getPlugin = async (pluginId: string): Promise<Record<string, unknown>> => {
    const { data, error } = await supabase
        .from('plugins')
        .select('*')
        .eq('plugin_id', pluginId);

    if (handleSupabaseError(error, 'Error fetching plugin')) return {};
    if (data && data.length > 0) {
        return data[0];
    }
    return {};
};

export const getUserReposSvc = async (githubAccessToken: string): Promise<Repo[]> => {
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

    if (handleSupabaseError(error, 'Error fetching store plugins')) return [];
    return data;
};

export const createPluginSvc = async (githubAccessToken: string, name: string, repoId: string, categories: string[], branch: string): Promise<boolean> => {
    const [exists, isOwner, isCategoriesValid] = await Promise.all([
        checkIfRepoExists(repoId),
        validateRepoOwnership(repoId, githubAccessToken),
        Promise.resolve(areValidCategories(categories))
    ]);

    if (exists || !isCategoriesValid || !isOwner) return false;

    const [uuid, repoUrl] = await Promise.all([
        getStoreUUID(githubAccessToken),
        getRepoUrl(repoId, githubAccessToken)
    ]).catch((error) => {
        console.error(error.message);
        return ['', ''];
    });

    if (!uuid || !repoUrl) return false;

    const { error } = await supabase
        .from('plugins')
        .insert([{ plugin_name: name, repo_id: repoId, owner: uuid, categories, repo_url: repoUrl, branch }]);

    if (handleSupabaseError(error, 'Error creating plugin')) return false;
    return true;
};

export const updatePluginSvc = async (githubAccessToken: string, name: string, plugin_id: string, repoId: string, categories: string[], branch: string): Promise<boolean> => {
    const [isOwner, isCategoriesValid] = await Promise.all([
        validateRepoOwnership(repoId, githubAccessToken),
        Promise.resolve(areValidCategories(categories))
    ]);

    if (!isCategoriesValid || !isOwner) return false;

    const [uuid, repoUrl] = await Promise.all([
        getStoreUUID(githubAccessToken),
        getRepoUrl(repoId, githubAccessToken)
    ]);

    if (!uuid || !repoUrl) return false;

    const updateTimestampz = new Date().toISOString();
    const plugin = await getPlugin(plugin_id);
    if (!plugin) return false;
    const newVersion = (plugin as { version: number }).version + 1;

    const { error } = await supabase
        .from('plugins')
        .update({ plugin_name: name, categories, branch, updated_at: updateTimestampz, repo_url: repoUrl, repo_id: repoId, version: newVersion })
        .eq('plugin_id', plugin_id);

    if (handleSupabaseError(error, 'Error updating plugin')) return false;
    return true;
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

    if (handleSupabaseError(error, 'Error deleting plugin')) return false;
    return true;
};