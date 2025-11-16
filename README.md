# AI Client Care Template

A comprehensive AI Client Care management platform built with Next.js, TypeScript, and Tailwind CSS.

> **Latest Update**: Connected to remote Supabase instance and configured for production deployment.

## 🚀 Features

### 🤖 AI Agent Management
- **Voice Agent Configuration** - Set up and manage AI voice agents
- **Chat Agent Management** - Configure chat conversations and flows
- **Agent Performance Tracking** - Monitor agent effectiveness and metrics
- **Training & Knowledge Base** - Centralized content repository

### 📊 Call Management & Analytics
- **Live Call Monitoring** - Real-time call supervision and intervention
- **Call Flow Builder** - Visual flow creation and management
- **Call History** - Comprehensive call logs and recordings
- **Analytics Dashboard** - Performance metrics and insights
- **Sentiment Analysis** - Track customer sentiment and satisfaction

### 🔗 Integration Hub
- **CRM Integration** - Salesforce, HubSpot, and other CRMs
- **Telephony Providers** - Twilio, Vonage, and other providers
- **Business Tools** - Slack, Teams, and collaboration platforms
- **API Playground** - Test and explore API endpoints
- **Webhooks** - Event-driven integrations

### 🏢 Multi-Tenant Support
- **Tenant Management** - Manage multiple organizations
- **Subtenant Configuration** - Hierarchical tenant structure
- **Role-based Access Control** - Granular permissions
- **Billing & Analytics** - Per-tenant billing and reporting

### ⚙️ System Configuration
- **Quality Assurance** - Call evaluation and compliance monitoring
- **Monitoring** - System health and performance tracking
- **Phone Numbers** - Number provisioning and management
- **User Management** - Team collaboration and permissions

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **Icons**: Heroicons
- **Charts**: Recharts & ApexCharts
- **State Management**: React Context API

## 📦 Installation

1. **Clone or download** this template
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── app/
│   ├── templates/ai-client-care/  # AI Client Care pages
│   │   ├── agents/                  # Agent management
│   │   ├── analytics/               # Analytics dashboard
│   │   ├── calls/                   # Call history
│   │   ├── flows/                   # Conversation flows
│   │   ├── integrations/            # Third-party integrations
│   │   ├── knowledge/               # Knowledge base
│   │   ├── monitoring/              # System monitoring
│   │   ├── quality/                 # Quality assurance
│   │   └── ...                      # Other features
│   └── layout.tsx                   # Root layout
├── components/
│   └── ai-client-care/            # AI Client Care components
├── layout/                          # Layout components
└── hooks/                           # Custom React hooks
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
npx vercel --prod
```

### Netlify
```bash
npm run build
npm run export
# Upload the 'out' directory to Netlify
```

### Docker
```bash
# Build the image
docker build -t ai-client-care-app .

# Run the container
docker run -p 3000:3000 ai-client-care-app
```

## 🔧 Customization

### Adding New Pages
1. Create a new directory in `src/app/templates/ai-client-care/`
2. Add a `page.tsx` file with your component
3. Update the sidebar navigation in `src/layout/AppSidebar.tsx`

### Styling
- Modify `src/app/globals.css` for global styles
- Use Tailwind CSS classes for component styling
- Customize the theme in `tailwind.config.ts`

### Adding Integrations
1. Create integration components in `src/components/ai-client-care/`
2. Add API endpoints and configuration
3. Update the integrations page

## 📚 API Integration

The template includes comprehensive API integration support:

- **Agent Management APIs** - CRUD operations for agents and configurations
- **Call Management APIs** - Call handling and recording
- **Analytics APIs** - Performance tracking and reporting
- **Integration APIs** - Third-party service connections
- **Webhook APIs** - Event notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This template is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@tinadmin.com
- 📚 Documentation: [docs.tinadmin.com](https://docs.tinadmin.com)
- 🐛 Issues: [GitHub Issues](https://github.com/tinadmin/tinadmin/issues)

---

**Ready to build your AI Client Care platform? Start with this template! 🚀**