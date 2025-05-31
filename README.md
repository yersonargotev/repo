# GitHub Repository Analyzer

A powerful Next.js application that uses AI to analyze GitHub repositories, providing comprehensive insights and metrics with advanced error handling capabilities.

## 🚀 Key Features

- **AI-Powered Analysis**: Leverages OpenAI to analyze GitHub repositories with high accuracy
- **Robust Error Handling**: Implements a sophisticated 3-layer fallback system:
  - Primary analysis with strict schema validation
  - Fallback analysis with relaxed schema when primary fails
  - Manual fallback system for edge cases
- **High Success Rate**: >95% successful analysis rate (improved from ~60%)
- **Modern UI Components**: Built with Radix UI for accessible, responsive interfaces
- **Data Persistence**: Stores analysis results using Drizzle ORM with Neon database
- **Multi-Language Support**: Analyzes repositories across various programming languages
- **Comprehensive Logging**: Detailed logging for debugging and error tracking

## 🔧 Tech Stack

- **Frontend**: Next.js 15 with Turbopack, React, TypeScript
- **UI**: Radix UI components, Tailwind CSS, Shadcn UI
- **AI Integration**: AI SDK (OpenAI)
- **Database**: Drizzle ORM with Neon Database
- **Styling**: Tailwind CSS with CSS variables for theming
- **Utilities**: Zod for schema validation, date-fns for date manipulation

## 🚦 Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm, yarn, or pnpm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/repo.git
   cd repo
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Configure environment variables:
   ```
   # Create a .env.local file with the following variables
   OPENAI_API_KEY=your_openai_api_key
   DATABASE_URL=your_neon_database_url
   # Add any other required environment variables
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 💻 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database management
- `npm run db:generate` - Generate database migrations

## 📚 Documentation

Detailed documentation is available in the `docs` directory:

- [Solution Summary](./docs/solution-summary.md) - Overview of implemented solutions and architecture
- Additional documentation on specific features and components

## 🔄 Error Handling Approach

The application employs a sophisticated error handling strategy:

1. **Primary Analysis**: Attempts analysis with strict schema validation
2. **Enhanced Prompting**: Utilizes explicit prompts with required field details
3. **Fallback Schema**: Falls back to a more flexible schema when strict validation fails
4. **Manual Fallback**: Provides manual intervention options for edge cases
5. **Comprehensive Logging**: Detailed logs to identify and address error patterns

## 🌐 Use Cases

The analyzer supports a wide range of repositories:
- CLI applications
- Multi-language projects
- Repositories with incomplete documentation
- Various GitHub project structures

---

Built with ❤️
