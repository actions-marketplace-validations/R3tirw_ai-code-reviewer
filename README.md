# 🤖 AI Code Reviewer

> Automated pull request reviews powered by Claude AI — catch bugs, security issues, and code smells before they hit your main branch.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-AI%20Code%20Reviewer-blue?logo=github)](https://github.com/marketplace/actions/ai-code-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What it does

Every time a pull request is opened or updated, AI Code Reviewer automatically:

- 📋 **Summarises** what the PR is trying to do
- 🐛 **Catches bugs** and logical errors
- 🔒 **Flags security vulnerabilities**
- ⚡ **Spots performance issues**
- 💡 **Suggests improvements** with specific, actionable feedback
- ✅ **Gives a verdict** — Approved, Needs Work, or Critical Issues

All posted as a comment directly on the PR. No new tools, no dashboards, no context switching.

---

## Quick Start

Add this file to your repository at `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: AI Code Review
        uses: R3tirw/ai-code-reviewer@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

Then add your Anthropic API key as a GitHub Secret named `ANTHROPIC_API_KEY`.

That's it. Every PR from this point gets an AI review.

---

## Getting an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up and add a payment method
3. Go to **API Keys** → **Create Key**
4. Add it to your repo under **Settings → Secrets → Actions → New repository secret**

Cost per review: approximately $0.01–$0.05 depending on diff size.

---

## Configuration

All inputs are optional except `anthropic_api_key`.

| Input | Description | Default |
|-------|-------------|---------|
| `anthropic_api_key` | Your Anthropic API key | Required |
| `github_token` | GitHub token for posting comments | Auto-provided |
| `model` | Claude model to use | `claude-sonnet-4-5` |
| `max_tokens` | Maximum response length | `4096` |
| `review_level` | `basic`, `standard`, or `thorough` | `standard` |

### Review Levels

**basic** — Critical bugs and security issues only. Fast and focused.

**standard** — Full review covering bugs, security, performance, and code quality. Recommended for most teams.

**thorough** — Deep architectural analysis with code examples and test coverage gaps. Best for complex PRs.

---

## Example Review

Here's what a review comment looks like on your PR:

> **Verdict: ⚠️ Needs Work**
>
> **Summary**
> This PR adds user authentication but stores passwords in plaintext and lacks input validation.
>
> **Findings**
> - 🚨 Passwords stored without hashing — use bcrypt or argon2
> - ⚠️ No input sanitisation on email field — SQL injection risk
> - ⚠️ JWT secret hardcoded in source — move to environment variable
>
> **Suggestions**
> - Add middleware for request validation using zod or joi
> - Implement rate limiting on the login endpoint
> - Add unit tests for the authentication flow

---

## Privacy

Your code is sent to Anthropic's API for review. Anthropic's data handling policies apply. For sensitive codebases, review [Anthropic's privacy policy](https://www.anthropic.com/privacy) before use.

---

## Contributing

PRs welcome. Please open an issue first to discuss significant changes.

---

## License

MIT © [R3tirw](https://github.com/R3tirw)
