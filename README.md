# ChatGenius

A real-time messaging platform designed for team collaboration, featuring secure authentication, organized communication via channels and DMs, and essential tools like file sharing, threaded conversations, and emoji reactions.

## Tech Stack

- **Frontend Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Authentication**: Supabase Auth (Discord + GitHub)
- **UI Components**: Radix UI, shadcn/ui
- **Deployment**: Vercel

## Features

### Real-time Communication

- Instant messaging with real-time updates
- Channel-based communication with public channels
- Direct messaging with online presence indicators
- User status tracking (online, away, offline)
- Message search functionality with keyboard shortcuts (Cmd/Ctrl + K)
- Threaded conversations with real-time updates and notifications
- Emoji reactions with real-time updates and reaction counts

### Rich Message Editor

- Rich text formatting (bold, italic, strikethrough)
- File attachments support with drag & drop
- Multiple file upload with preview
- Support for various file types (images, documents, etc.)
- Keyboard shortcuts for sending messages (Enter) and formatting

### Modern UI/UX

- Clean, responsive interface with Tailwind CSS
- Real-time typing indicators
- Online presence indicators
- User avatars with fallback initials
- Collapsible channel and DM lists
- Message timestamps and user info
- File preview for images and documents

### File Sharing

- Drag and drop file uploads
- Image previews in chat
- Support for multiple file types:
    - Images (JPEG, PNG, GIF)
    - Documents (PDF, DOCX, XLSX)
    - Text files
    - Archives (ZIP)
    - Videos (MP4, QuickTime)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Set up your environment variables:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials

5. Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

This project uses:

- [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) with [Geist](https://vercel.com/font)
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Tailwind CSS for styling
- shadcn/ui for component primitives

## Learn More

To learn more about the tech stack:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TipTap Editor](https://tiptap.dev)
- [Zustand](https://github.com/pmndrs/zustand)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
