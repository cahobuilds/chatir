# Vercel CI/CD Setup Guide

This guide will help you set up automatic deployments to Vercel when pushing to the `develop` branch.

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **VERCEL_TOKEN** - Get from https://vercel.com/account/tokens
2. **VERCEL_ORG_ID** - Found in .vercel/project.json after running `vercel link`
3. **VERCEL_PROJECT_ID** - Found in .vercel/project.json after running `vercel link`

## Quick Setup

```bash
# Login to Vercel
vercel login

# Link your project
vercel link

# View project details
cat .vercel/project.json
```

## Workflow Behavior

- **Push to develop**: Automatically deploys to production
- **Pull request to develop**: Creates preview deployment

For detailed instructions, see .github/VERCEL_SETUP.md
