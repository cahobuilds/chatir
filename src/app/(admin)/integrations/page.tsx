import type { Metadata } from "next";
import React from "react";
import IntegrationsHeader from "@/components/IntegrationsHeader";
import IntegrationsOverview from "@/components/IntegrationsOverview";
import ActiveIntegrations from "@/components/ActiveIntegrations";
import IntegrationCategory from "@/components/IntegrationCategory";

export const metadata: Metadata = {
  title:
    "Integration Hub | TinAdmin - AI Customer Care Dashboard",
  description: "Connect with CRMs, telephony providers, and business tools to enhance AI customer care operations.",
};

export default function IntegrationsPage() {
  const integrationCategories = [
    {
      name: "Telephony Providers",
      description: "Connect with voice and SMS communication services",
      integrations: [
        { 
          id: "twilio", 
          name: "Twilio Voice", 
          description: "Voice and SMS communication platform", 
          icon: "📞",
          status: "connected" as const,
          category: "Telephony"
        },
        { 
          id: "vonage", 
          name: "Vonage", 
          description: "Advanced call features and global connectivity", 
          icon: "🌐",
          status: "available" as const,
          category: "Telephony"
        },
        { 
          id: "telnyx", 
          name: "Telnyx", 
          description: "Programmable voice and messaging", 
          icon: "📱",
          status: "available" as const,
          category: "Telephony"
        },
        { 
          id: "bandwidth", 
          name: "Bandwidth", 
          description: "Reliable voice and messaging infrastructure", 
          icon: "🔊",
          status: "available" as const,
          category: "Telephony"
        },
      ],
    },
    {
      name: "CRM Systems",
      description: "Sync customer data and interaction history",
      integrations: [
        { 
          id: "salesforce", 
          name: "Salesforce", 
          description: "Enterprise customer relationship management", 
          icon: "☁️",
          status: "connected" as const,
          category: "CRM"
        },
        { 
          id: "hubspot", 
          name: "HubSpot", 
          description: "Marketing and sales automation platform", 
          icon: "🎯",
          status: "connected" as const,
          category: "CRM"
        },
        { 
          id: "zendesk", 
          name: "Zendesk", 
          description: "Customer service and support platform", 
          icon: "🎫",
          status: "available" as const,
          category: "CRM"
        },
        { 
          id: "freshdesk", 
          name: "Freshdesk", 
          description: "Helpdesk and customer support solution", 
          icon: "🆘",
          status: "available" as const,
          category: "CRM"
        },
        { 
          id: "pipedrive", 
          name: "Pipedrive", 
          description: "Sales pipeline management", 
          icon: "📈",
          status: "available" as const,
          category: "CRM"
        },
        { 
          id: "custom_crm", 
          name: "Custom CRM", 
          description: "Connect your custom CRM via API", 
          icon: "🔧",
          status: "available" as const,
          category: "CRM"
        },
      ],
    },
    {
      name: "Calendar & Scheduling",
      description: "Manage appointments and agent availability",
      integrations: [
        { 
          id: "calendly", 
          name: "Calendly", 
          description: "Automated appointment scheduling", 
          icon: "📅",
          status: "connected" as const,
          category: "Scheduling"
        },
        { 
          id: "cal_com", 
          name: "Cal.com", 
          description: "Open source scheduling platform", 
          icon: "⏰",
          status: "available" as const,
          category: "Scheduling"
        },
        { 
          id: "google_calendar", 
          name: "Google Calendar", 
          description: "Google Workspace calendar integration", 
          icon: "📆",
          status: "available" as const,
          category: "Scheduling"
        },
        { 
          id: "outlook", 
          name: "Outlook Calendar", 
          description: "Microsoft 365 calendar integration", 
          icon: "📊",
          status: "available" as const,
          category: "Scheduling"
        },
      ],
    },
    {
      name: "Business Tools",
      description: "Collaboration and workflow automation",
      integrations: [
        { 
          id: "slack", 
          name: "Slack", 
          description: "Team communication and notifications", 
          icon: "💬",
          status: "connected" as const,
          category: "Business Tools"
        },
        { 
          id: "teams", 
          name: "Microsoft Teams", 
          description: "Microsoft 365 collaboration platform", 
          icon: "👥",
          status: "available" as const,
          category: "Business Tools"
        },
        { 
          id: "zapier", 
          name: "Zapier", 
          description: "Automate workflows between apps", 
          icon: "⚡",
          status: "available" as const,
          category: "Business Tools"
        },
        { 
          id: "make", 
          name: "Make (Integromat)", 
          description: "Visual automation platform", 
          icon: "🔗",
          status: "available" as const,
          category: "Business Tools"
        },
        { 
          id: "webhooks", 
          name: "Custom Webhooks", 
          description: "Connect custom applications via webhooks", 
          icon: "🔌",
          status: "available" as const,
          category: "Business Tools"
        },
      ],
    },
    {
      name: "Analytics Platforms",
      description: "Track performance and customer insights",
      integrations: [
        { 
          id: "google_analytics", 
          name: "Google Analytics", 
          description: "Website and app performance tracking", 
          icon: "📊",
          status: "connected" as const,
          category: "Analytics"
        },
        { 
          id: "mixpanel", 
          name: "Mixpanel", 
          description: "Product analytics and user behavior", 
          icon: "📈",
          status: "available" as const,
          category: "Analytics"
        },
        { 
          id: "segment", 
          name: "Segment", 
          description: "Customer data platform", 
          icon: "📋",
          status: "available" as const,
          category: "Analytics"
        },
        { 
          id: "amplitude", 
          name: "Amplitude", 
          description: "Digital analytics and experimentation", 
          icon: "🔬",
          status: "available" as const,
          category: "Analytics"
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <IntegrationsHeader />
      
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-8">
          <IntegrationsOverview />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <ActiveIntegrations />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Available Integrations
        </h2>
        {integrationCategories.map((category) => (
          <IntegrationCategory 
            key={category.name} 
            name={category.name}
            description={category.description}
            integrations={category.integrations}
          />
        ))}
      </div>
    </div>
  );
}
