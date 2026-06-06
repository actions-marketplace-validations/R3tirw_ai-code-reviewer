const Anthropic = require('@anthropic-ai/sdk');
const { Octokit } = require('@octokit/rest');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const REVIEW_PROMPTS = {
  basic: `You are a code reviewer. Review this pull request diff and identify only critical bugs and security issues.`,
  standard: `You are an expert code reviewer with deep knowledge of software engineering best practices. 
Review this pull request diff and provide structured feedback covering:
1. Bugs and logical errors
2. Security vulnerabilities  
3. Performance issues
4. Code quality and maintainability
5. Specific improvement suggestions

Be constructive, specific, and actionable.`,
  thorough: `You are a senior software architect and expert code reviewer. 
Review this pull request diff with deep analysis covering:
1. Bugs and logical errors (with line references where possible)
2. Security vulnerabilities and attack vectors
3. Performance bottlenecks and optimization opportunities
4. Code quality, maintainability, and technical debt
5. Design patterns and architectural concerns
6. Test coverage gaps
7. Documentation gaps
8. Specific, actionable improvement suggestions with code examples where helpful

Be thorough, constructive, and educational in your feedback.`
};

const REVIEW_TEMPLATE = (verdict, summary, findings, suggestions) => `
## 🤖 AI Code Review

**Verdict: ${verdict}**

### 📋 Summary
${summary}

### 🔍 Findings
${findings}

### 💡 Suggestions
${suggestions}

---
*Powered by [AI Code Reviewer](https://github.com/R3tirw/ai-code-reviewer) using Claude by Anthropic*
`;

async function getPRDiff(owner, repo, pullNumber) {
  const response = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: 'diff',
    },
  });
  return response.data;
}

async function getPRDetails(owner, repo, pullNumber) {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return {
    title: data.title,
    description: data.body || 'No description provided',
    author: data.user.login,
    changedFiles: data.changed_files,
    additions: data.additions,
    deletions: data.deletions,
  };
}

async function reviewCode(diff, prDetails, reviewLevel) {
  const systemPrompt = REVIEW_PROMPTS[reviewLevel] || REVIEW_PROMPTS.standard;
  
  const userPrompt = `
PR Title: ${prDetails.title}
PR Description: ${prDetails.description}
Author: ${prDetails.author}
Changed Files: ${prDetails.changedFiles}
Additions: ${prDetails.additions} | Deletions: ${prDetails.deletions}

Here is the diff to review:

\`\`\`diff
${diff.slice(0, 15000)}
\`\`\`

Provide your review in this exact format:

VERDICT: [✅ Approved / ⚠️ Needs Work / 🚨 Critical Issues]

SUMMARY:
[2-3 sentences describing what this PR does and your overall assessment]

FINDINGS:
[Bullet points of specific issues found, or "No significant issues found" if clean]

SUGGESTIONS:
[Bullet points of specific improvements, or "Code looks good as-is" if nothing to add]
`;

  const message = await anthropic.messages.create({
    model: process.env.MODEL || 'claude-sonnet-4-20250514',
    max_tokens: parseInt(process.env.MAX_TOKENS) || 4096,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  return message.content[0].text;
}

function parseReview(reviewText) {
  const verdictMatch = reviewText.match(/VERDICT:\s*(.+)/);
  const summaryMatch = reviewText.match(/SUMMARY:\s*([\s\S]*?)(?=FINDINGS:|$)/);
  const findingsMatch = reviewText.match(/FINDINGS:\s*([\s\S]*?)(?=SUGGESTIONS:|$)/);
  const suggestionsMatch = reviewText.match(/SUGGESTIONS:\s*([\s\S]*?)$/);

  return {
    verdict: verdictMatch ? verdictMatch[1].trim() : '⚠️ Needs Work',
    summary: summaryMatch ? summaryMatch[1].trim() : reviewText,
    findings: findingsMatch ? findingsMatch[1].trim() : 'See summary above.',
    suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : 'See summary above.',
  };
}

async function postComment(owner, repo, pullNumber, comment) {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: comment,
  });
}

async function run() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    const event = require(eventPath);
    
    const owner = event.repository.owner.login;
    const repo = event.repository.name;
    const pullNumber = event.pull_request.number;
    const reviewLevel = process.env.REVIEW_LEVEL || 'standard';

    console.log(`🔍 Reviewing PR #${pullNumber} in ${owner}/${repo}`);
    console.log(`📊 Review level: ${reviewLevel}`);

    const [diff, prDetails] = await Promise.all([
      getPRDiff(owner, repo, pullNumber),
      getPRDetails(owner, repo, pullNumber),
    ]);

    if (!diff || diff.length === 0) {
      console.log('No diff found, skipping review.');
      return;
    }

    console.log(`📝 Diff size: ${diff.length} characters`);
    console.log('🤖 Sending to Claude for review...');

    const reviewText = await reviewCode(diff, prDetails, reviewLevel);
    const { verdict, summary, findings, suggestions } = parseReview(reviewText);
    const comment = REVIEW_TEMPLATE(verdict, summary, findings, suggestions);

    await postComment(owner, repo, pullNumber, comment);
    console.log('✅ Review posted successfully!');

  } catch (error) {
    console.error('❌ Error running AI code reviewer:', error);
    process.exit(1);
  }
}

run();
