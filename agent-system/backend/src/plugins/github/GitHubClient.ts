import { logger } from '../../utils/logger.js';

export class GitHubClient {
  private baseUrl = 'https://api.github.com';

  constructor(private token?: string) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async getRepo(owner: string, repo: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string,
    labels?: string[],
  ): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ title, body, labels }),
    });
    if (!res.ok) throw new Error(`GitHub create issue failed: ${res.status}`);
    return res.json();
  }

  async createPRComment(owner: string, repo: string, prNumber: number, body: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ body }),
      },
    );
    if (!res.ok) {
      logger.error('Failed to create PR comment', { status: res.status });
    }
  }

  async getOpenPRs(owner: string, repo: string): Promise<unknown[]> {
    const res = await fetch(
      `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=open`,
      { headers: this.headers },
    );
    if (!res.ok) return [];
    return res.json() as Promise<unknown[]>;
  }
}
