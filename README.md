This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Quote & Word of the Day Application

A learning application for tracking and enriching daily words and quotes with definitions, pronunciations, etymology, and contextual information.

## Features

- **Word of the Day**: Lookup definitions, pronunciations (IPA), etymology, and example sentences
- **Quote of the Day**: Lookup quotes with author, source, context, background, interpretation, and significance
- **AI-Powered Quote Lookup**: Uses OpenAI to find comprehensive information about quotes
- **Participant Tracking**: Track submissions by multiple participants
- **Filtering**: Filter entries by participant, type (word/quote), and date
- **Auto-population**: Automatic lookup and population of word and quote metadata

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account (for database)
- OpenAI API key (optional, for enhanced quote lookup)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/micklebt/qotd-wod.git
cd qotd-wod
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
# OpenAI API Key for quote lookup (optional but recommended)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## OpenAI Integration

The application uses OpenAI (GPT-4o-mini) for comprehensive quote lookup. This provides:

- Author identification
- Source attribution
- Historical context
- Background information
- Interpretation and significance

**To enable OpenAI quote lookup:**

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env.local` file as `OPENAI_API_KEY`
3. The system will automatically use AI lookup when the API key is configured
4. If no API key is set, the system falls back to free quote databases

**Note:** OpenAI API usage incurs costs based on usage. The system uses `gpt-4o-mini` for cost efficiency, but you can modify the model in `app/api/quote-ai/route.ts` if needed.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

The easiest way to deploy this Next.js app is using **Vercel**, the platform created by the Next.js team.

### Quick Deploy to Vercel

1. **Push your code to GitHub** (if not already done)
2. **Sign up at [vercel.com](https://vercel.com)** (free account)
3. **Import your GitHub repository**: `micklebt/qotd-wod`
4. **Add Environment Variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `OPENAI_API_KEY` - Your OpenAI API key (optional)
5. **Deploy** - Vercel will automatically build and deploy
6. **Run database migrations** in Supabase SQL Editor:
   - `create_participants_table.sql`
   - `create_word_challenge_responses_table.sql`

**That's it!** Your app will be live at `https://your-project.vercel.app`

### Detailed Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions, troubleshooting, and alternative deployment options.

### Environment Variables Required

- `NEXT_PUBLIC_SUPABASE_URL` - Required
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Required  
- `OPENAI_API_KEY` - Optional (for AI quote lookup)

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
