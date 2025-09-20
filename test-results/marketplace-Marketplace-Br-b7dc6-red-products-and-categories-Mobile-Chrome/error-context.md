# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img [ref=e7]
    - heading "Environment Configuration Required" [level=1] [ref=e9]
    - paragraph [ref=e10]: Art-O-Mart needs to be configured before it can run properly.
  - generic [ref=e12]: "🚨 Environment Configuration Required ❌ VITE_SUPABASE_URL: VITE_SUPABASE_URL: Please configure your actual Supabase project URL Setup Instructions: 1. Go to https://app.supabase.com 2. Create a new project or select existing project 3. Go to Settings > API 4. Copy the Project URL ❌ VITE_SUPABASE_ANON_KEY: VITE_SUPABASE_ANON_KEY: Please configure your actual Supabase anon key Setup Instructions: 1. Go to https://app.supabase.com 2. Select your project > Settings > API 3. Copy the anon public key 📝 Please update your .env file with the required values. 💡 See ENVIRONMENT_SETUP.md for detailed instructions. ⚠️ Warnings: VITE_BACKEND_URL: Using default value: null VITE_SUPABASE_URL: Using placeholder Supabase URL - some features may not work"
  - generic [ref=e13]:
    - generic [ref=e14]:
      - img [ref=e15]
      - heading "Development Mode" [level=3] [ref=e17]
    - paragraph [ref=e18]: You're running in development mode. The app can run with limited functionality using placeholder values, but for full features, please configure the environment variables above.
  - generic [ref=e19]:
    - button "Retry Configuration" [ref=e20] [cursor=pointer]
    - link "View Setup Guide" [ref=e21] [cursor=pointer]:
      - /url: https://github.com/your-repo/Art-O-Mart-Gen-AI-Exchange-Hackathon-H2S#environment-setup
```