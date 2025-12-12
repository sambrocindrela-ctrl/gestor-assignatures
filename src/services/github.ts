export interface GitHubFile {
    content: string; // Base64 encoded
    sha: string;
    encoding: string;
}

export interface GitHubCommitAuthor {
    name: string;
    email: string;
}

// Helper to encode/decode UTF-8 strings to Base64 avoiding Latin1 issues
function utf8_to_b64(str: string): string {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string): string {
    return decodeURIComponent(escape(window.atob(str)));
}

export async function getRepoContent(
    owner: string,
    repo: string,
    path: string,
    token: string,
    branch: string = "main"
): Promise<{ content: string; sha: string }> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("File not found");
        }
        const err = await response.json();
        throw new Error(err.message || "Error fetching file from GitHub");
    }

    const data = await response.json();
    // GitHub returns content in Base64 (usually with newlines)
    const rawContent = data.content.replace(/\n/g, "");
    const decodedContent = b64_to_utf8(rawContent);

    return {
        content: decodedContent,
        sha: data.sha,
    };
}

export async function saveRepoContent(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    token: string,
    sha?: string, // Required if updating an existing file
    branch: string = "main"
): Promise<void> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const body: any = {
        message,
        content: utf8_to_b64(content),
        branch,
    };

    if (sha) {
        body.sha = sha;
    }

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Error saving file to GitHub");
    }
}
