import { defineConfig } from 'vite'

function resolveBase() {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH

  const inGitHubActions = process.env.GITHUB_ACTIONS === 'true'
  if (!inGitHubActions) return '/'

  const repo = (process.env.GITHUB_REPOSITORY || '').split('/')[1] || ''
  if (!repo) return '/'

  // User/Org pages repo should use root path.
  if (repo.endsWith('.github.io')) return '/'

  // Project pages repo should be served under /<repo>/.
  return `/${repo}/`
}

export default defineConfig({
  base: resolveBase(),
})

