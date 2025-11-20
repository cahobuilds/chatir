# GitHub Actions Workflows

This directory contains CI/CD workflows for the multi-tenant AI Client Care platform.

## Workflows

### `simple-ci.yml` (Recommended)
A streamlined CI/CD pipeline that:
- Runs on every push to `main` and pull requests
- Performs linting, type checking, and build verification
- Automatically deploys to Vercel production on push to `main`

**Required Secrets:**
- `VERCEL_TOKEN` - Your Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID (optional, can be set in project)
- `VERCEL_PROJECT_ID` - Your Vercel project ID (optional, can be set in project)

### Other Workflows

- `ci-cd.yml` - Comprehensive CI/CD with multiple environments
- `deploy-vercel.yml` - Vercel deployment workflow
- `pr-check.yml` - Pull request quality checks
- `code-quality.yml` - Code quality and linting
- `dependencies.yml` - Dependency updates and security checks

## Setup Instructions

1. **Get Vercel Token:**
   - Go to [Vercel Dashboard](https://vercel.com/account/tokens)
   - Create a new token
   - Add it to GitHub Secrets as `VERCEL_TOKEN`

2. **Get Vercel Project IDs (Optional):**
   - Go to your Vercel project settings
   - Find Organization ID and Project ID
   - Add to GitHub Secrets if needed

3. **Set up Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`

## Workflow Triggers

- **Push to main**: Runs CI checks and deploys to production
- **Pull Request**: Runs CI checks only (no deployment)







