# Your Content studio

The online version is connected locally to the owner's Supabase project. Supabase stores your content, uploaded files and studio accounts; Vercel will serve the website. The owner has signed in, imported, saved and published the existing portfolio. Deployment, media-upload verification and password recovery remain to be completed. The existing domain has not changed.

Connection check: the configured project responds successfully, public sign-ups are disabled, email authentication is enabled, and anonymous requests cannot read drafts, history or the owner allowlist. Published revision 1 matches the imported portfolio: 4 projects, 37 reels, 7 motion explorations, 20 social designs and 8 logo placeholders. Every referenced local asset is present in the deployment build. Both the deployment build and studio preview include the real connection. The browser-safe connection settings are in ignored `.env.local`; they still need to be added to Vercel. No password or administrative key is stored in the website.

## Online studio — after setup

Open `/content-editor.html` on your website and sign in with your approved studio account. Visitors can reach the login page, but cannot read your draft, edit content or upload files. There is no public sign-up in the studio. Access is checked by the database and storage service, not just by hiding the interface.

1. Choose Projects, Reels, Motion explorations, Social designs or Client logos.
2. Select an item. Replace its file, paste a direct media link, or change its text. Use the size guide in the middle column when exporting artwork.
3. Use **Move earlier / Move later** to change the order. Turn off **Show this item** to hide it without deleting it.
4. Click **Save draft** to keep changes private. Click **Publish** when ready to update the public website. Refresh **View website** to see the published version. Content updates do not require a new website deployment.

For projects, the media list controls the order inside the popup. Put a logo-reveal video first for autoplay. Reels and explorations can have an optional cover image. The homepage displays the first six visible social designs.

New uploads stay in a private library until you publish. Publishing copies visible items' files to public media storage. Hiding an item removes it from the portfolio, but does not revoke a previously published file's URL. The original website's existing media is already public. Keep original artwork exports separately: a downloaded content backup contains text and links, not the files themselves. Saved drafts also keep previous content versions in the database.

Two open studio windows cannot silently overwrite one another: a stale save or publication is rejected. Download the unsaved draft before reloading if this happens. Use **Sign out** on shared computers.

## One-time online setup

1. Create or sign in to your own account at https://supabase.com/dashboard and create a project. Enter passwords on that service directly; do not paste them into chat or source files.
2. In the project's SQL editor, run `supabase/portfolio-studio.sql`. This creates private drafts, public published content, history, two media buckets and owner-only access rules.
3. Create the studio user in Supabase Authentication. Grant only that user's email access with the final commented SQL statement, replacing `YOUR_EMAIL`. Disable new public sign-ups in Authentication settings. The Supabase dashboard account and studio user are separate accounts.
4. Set the Authentication Site URL to the deployed portfolio URL. Allow the exact `/content-editor.html` URL for password-reset redirects. Configure and test email delivery for that studio user before relying on **Forgot password?**; Supabase email delivery restrictions may require an SMTP provider.
5. In Vercel's project environment settings, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from Supabase's connection settings. Use only the publishable key (or legacy anon key), never a secret or service-role key. `.env.example` documents local equivalents; real `.env` files are ignored by Git.
6. Deploy a Vercel Preview, verify owner login and that anonymous/other accounts cannot access drafts or uploads. In the studio choose **Import current portfolio**, then **Save draft**. Upload and preview a small test file, publish a reviewed draft, and check the public page while signed out. Also test password reset and sign-out.
7. Promote the reviewed site to the domain only when ready. Preserve the previous deployment for rollback. A rollback of website code does not roll back cloud content; restore a content backup and publish if needed.

The SQL and login flow have local automated checks, and the real Supabase project has passed anonymous-access and authentication-settings checks. The owner reported successful login, save and publish; public API verification confirms the expected published content. Upload, password recovery and the deployed login still need live verification. If the online content service is unavailable, the portfolio falls back to the visible content snapshot bundled with its last build.

## Local preview and builds

Open http://127.0.0.1:3000/content-editor.html while the local server is running. If it has stopped, double-click **Start Content Studio** in this folder. Node.js must remain installed, and the sibling `work/chrome-hero-build` folder contains the preview build. Without Supabase connection settings this remains the local editor: **Save changes** updates `public/portfolio-content.json`, uploads go into `public/portfolio-uploads`, and previous content lists go into `.content-backups`. Local saves do not change the live domain. `?online=1` shows the unconnected login interface for review; it does not provide real login.

`npm run build` creates `dist-portfolio` with the new portfolio as its homepage. Vercel uses this command and output folder. When both Supabase settings are configured it also includes the login-protected studio interface. Without those settings it excludes the studio. The local editor server, backups, hidden content and unused local uploads are excluded in either case. Never upload the entire project folder as the website.

`npm run build:studio` updates the local preview folder. The original website source and tracked `dist` files remain available; `npm run build:original` builds the legacy app. No deployment has been performed yet.

Export recommendations:

| Content | Recommended size | Notes |
|---|---|---|
| Project cover | 1400 × 800 px | 7:4 frame, JPG/WebP, ideally under 1 MB |
| Project artwork | 1600–2000 px wide | Any height; full proportions shown in popup |
| Reels | 1080 × 1920 px | 9:16, MP4/H.264 or WebM, ideally under 20 MB |
| Motion explorations | 1920 × 1080 px | Video fits without cropping; optional cover 1600 × 1000 px |
| Social designs | 1080 × 1080 or 1080 × 1350 px | Square or portrait, fits without cropping |
| Client logos | Around 600 × 300 px | Transparent PNG/WebP, light artwork, ideally under 200 KB |

The online editor accepts images up to 20 MB and videos up to 50 MB per file; the local editor accepts videos up to 150 MB. It reports dimensions and preserves original files; it does not resize, recompress or transcode them. Aim for videos under 20 MB for quick playback. Export Canva and Instagram content as actual image/video files before uploading. Your Supabase account's storage and bandwidth allowances still apply.
