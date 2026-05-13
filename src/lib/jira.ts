// Jira URL 빌더. 사내 Atlassian 인스턴스 기준.
// 환경변수 JIRA_BASE_URL 로 override 가능.

export const JIRA_BASE_URL =
  process.env.NEXT_PUBLIC_JIRA_BASE_URL ||
  process.env.JIRA_BASE_URL ||
  "https://airiss.atlassian.net";

export function jiraProjectUrl(projectKey: string): string {
  return `${JIRA_BASE_URL}/jira/software/projects/${encodeURIComponent(projectKey)}/boards`;
}

export function jiraBrowseUrl(issueKey: string): string {
  return `${JIRA_BASE_URL}/browse/${encodeURIComponent(issueKey)}`;
}

/** project + fixVersion 으로 잡힌 티켓 필터 (JQL) */
export function jiraFixVersionFilterUrl(projectKey: string, fixVersion: string): string {
  const jql = `project = "${projectKey}" AND fixVersion = "${fixVersion}" ORDER BY updated DESC`;
  return `${JIRA_BASE_URL}/issues/?jql=${encodeURIComponent(jql)}`;
}
