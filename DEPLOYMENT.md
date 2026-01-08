# Deployment Guide

## Best Option: Vercel (Recommended)

Vercel is the optimal choice for deploying Next.js applications because:
- **Made by Next.js creators** - Perfect integration and zero-config deployment
- **Free tier** - Generous limits for hobby projects
- **Automatic deployments** - Deploys on every git push
- **Built-in environment variables** - Easy configuration
- **Global CDN** - Fast performance worldwide
- **Preview deployments** - Test before going live
- **Supabase integration** - Works seamlessly with your database

---

## Deployment Steps

### Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub (already done ✅)
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. **Supabase Project** - Already set up ✅
4. **OpenAI API Key** - Optional but recommended

---

## Step-by-Step Deployment

### 1. Push Your Code to GitHub

Make sure all your code is committed and pushed:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in (or create account)
2. Click **"Add New Project"**
3. Import your GitHub repository: `micklebt/qotd-wod`
4. Vercel will auto-detect Next.js settings
5. **Configure Environment Variables** (see below)
6. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### 3. Configure Environment Variables

In the Vercel dashboard, go to your project → **Settings** → **Environment Variables** and add:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Optional (but recommended):
```
OPENAI_API_KEY=your_openai_api_key
```

**Important:**
- Add these for **Production**, **Preview**, and **Development** environments
- After adding variables, you may need to redeploy

### 4. Run Database Migrations

Before your app works fully, you need to run your SQL migrations in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run these SQL files in order:
   - `create_participants_table.sql` (if not already done)
   - `create_word_challenge_responses_table.sql`
   - Any other migration files you have

### 5. Verify Deployment

1. Vercel will provide you with a URL like: `https://qotd-wod.vercel.app`
2. Visit the URL and test:
   - Home page loads
   - Can create new entries
   - Word lookup works
   - Quote lookup works (if OpenAI key is set)
   - Word Challenge works

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Test word lookup functionality
- [ ] Test quote lookup functionality
- [ ] Test Word Challenge feature
- [ ] Verify participant selection works
- [ ] Check that entries can be created/edited/deleted
- [ ] Test filtering functionality

---

## Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificate

---

## Automatic Deployments

Once connected to GitHub, Vercel will:
- **Automatically deploy** on every push to `main` branch
- **Create preview deployments** for pull requests
- **Notify you** of deployment status via email

---

## Monitoring & Analytics

Vercel provides:
- **Deployment logs** - See build and runtime logs
- **Analytics** - Track page views and performance
- **Error tracking** - Monitor application errors
- **Speed Insights** - Performance metrics

---

## Alternative Deployment Options

### Netlify
- Good Next.js support
- Similar features to Vercel
- [netlify.com](https://netlify.com)

### Railway
- Good for full-stack apps
- Simple deployment
- [railway.app](https://railway.app)

### Render
- Free tier available
- Good for static and dynamic sites
- [render.com](https://render.com)

### Self-Hosting
- More control but more complex
- Requires server management
- Options: DigitalOcean, AWS, Google Cloud, etc.

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment Variables Not Working
- Make sure variables are added for the correct environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow public access where needed

### API Routes Not Working
- Check server-side environment variables (not `NEXT_PUBLIC_*`)
- Verify API routes are in `app/api/` directory
- Check function timeout settings (Vercel has limits)

---

## Cost Considerations

### Vercel Free Tier Includes:
- Unlimited personal projects
- 100GB bandwidth/month
- 100 serverless function executions/day
- Automatic SSL certificates
- Preview deployments

### Paid Plans Start At:
- **Pro**: $20/month - More bandwidth, team features
- **Enterprise**: Custom pricing - Advanced features

### Other Costs:
- **Supabase**: Free tier is generous, paid plans start at $25/month
- **OpenAI**: Pay-per-use, very affordable for this use case (~$0.01-0.10 per 1000 requests)

---

## Security Best Practices

1. **Never commit** `.env.local` or API keys to git
2. **Use environment variables** in Vercel dashboard
3. **Enable RLS** in Supabase for data protection
4. **Use Supabase anon key** (not service role key) in frontend
5. **Monitor API usage** to prevent unexpected costs

---

## Next Steps After Deployment

1. Share your live URL with participants
2. Monitor usage and performance
3. Set up custom domain (optional)
4. Configure analytics (optional)
5. Set up error tracking (optional)

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)


