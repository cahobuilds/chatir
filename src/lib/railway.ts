/**
 * Railway API Client
 * Handles GraphQL API calls to Railway for service management
 */

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';
const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID;

if (!RAILWAY_API_TOKEN && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: RAILWAY_API_TOKEN is not set');
}

if (!RAILWAY_PROJECT_ID && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: RAILWAY_PROJECT_ID is not set');
}

interface RailwayService {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
}

interface RailwayVariable {
  name: string;
  value: string;
}

/**
 * Execute a GraphQL query/mutation against Railway API
 */
async function railwayGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  if (!RAILWAY_API_TOKEN) {
    throw new Error('RAILWAY_API_TOKEN is not configured');
  }

  const response = await fetch(RAILWAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Railway API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Railway GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Create a new service in a Railway project
 */
export async function createRailwayService(
  projectId: string,
  serviceName: string,
  source?: {
    repo?: string;
    template?: string;
    image?: string;
  }
): Promise<RailwayService> {
  const mutation = `
    mutation CreateService($projectId: ID!, $name: String!, $source: ServiceSourceInput) {
      serviceCreate(projectId: $projectId, name: $name, source: $source) {
        id
        name
        projectId
        createdAt
        updatedAt
      }
    }
  `;

  const variables: any = {
    projectId,
    name: serviceName,
  };

  if (source) {
    variables.source = source;
  }

  const data = await railwayGraphQL<{ serviceCreate: RailwayService }>(mutation, variables);
  return data.serviceCreate;
}

/**
 * Get service by ID
 */
export async function getRailwayService(serviceId: string): Promise<RailwayService | null> {
  const query = `
    query GetService($serviceId: ID!) {
      service(id: $serviceId) {
        id
        name
        projectId
        createdAt
        updatedAt
      }
    }
  `;

  try {
    const data = await railwayGraphQL<{ service: RailwayService }>(query, { serviceId });
    return data.service;
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * List all services in a project
 */
export async function listRailwayServices(projectId: string): Promise<RailwayService[]> {
  const query = `
    query ListServices($projectId: ID!) {
      project(id: $projectId) {
        services {
          edges {
            node {
              id
              name
              projectId
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  `;

  const data = await railwayGraphQL<{ project: { services: { edges: Array<{ node: RailwayService }> } } }>(
    query,
    { projectId }
  );

  return data.project.services.edges.map(edge => edge.node);
}

/**
 * Update service environment variables
 */
export async function updateServiceVariables(
  serviceId: string,
  variables: RailwayVariable[]
): Promise<void> {
  const mutation = `
    mutation UpdateVariables($serviceId: ID!, $variables: [VariableInput!]!) {
      variableUpsert(serviceId: $serviceId, variables: $variables) {
        id
      }
    }
  `;

  await railwayGraphQL(mutation, {
    serviceId,
    variables: variables.map(v => ({
      name: v.name,
      value: v.value,
    })),
  });
}

/**
 * Create a new deployment for a service
 */
export async function createDeployment(serviceId: string): Promise<RailwayDeployment> {
  const mutation = `
    mutation CreateDeployment($serviceId: ID!) {
      deploymentCreate(serviceId: $serviceId) {
        id
        status
        createdAt
      }
    }
  `;

  const data = await railwayGraphQL<{ deploymentCreate: RailwayDeployment }>(mutation, { serviceId });
  return data.deploymentCreate;
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(deploymentId: string): Promise<{
  id: string;
  status: string;
  createdAt: string;
}> {
  const query = `
    query GetDeployment($deploymentId: ID!) {
      deployment(id: $deploymentId) {
        id
        status
        createdAt
      }
    }
  `;

  const data = await railwayGraphQL<{ deployment: RailwayDeployment }>(query, { deploymentId });
  return data.deployment;
}

/**
 * Delete a service
 */
export async function deleteRailwayService(serviceId: string): Promise<void> {
  const mutation = `
    mutation DeleteService($serviceId: ID!) {
      serviceDelete(id: $serviceId)
    }
  `;

  await railwayGraphQL(mutation, { serviceId });
}

/**
 * Get service domain/URL
 */
export async function getServiceDomain(serviceId: string): Promise<string | null> {
  const query = `
    query GetServiceDomain($serviceId: ID!) {
      service(id: $serviceId) {
        domains {
          domain
        }
      }
    }
  `;

  try {
    const data = await railwayGraphQL<{ service: { domains: Array<{ domain: string }> } }>(
      query,
      { serviceId }
    );
    return data.service.domains[0]?.domain || null;
  } catch (error) {
    console.error('Error fetching service domain:', error);
    return null;
  }
}

/**
 * Get the default Railway project ID from environment
 */
export function getDefaultProjectId(): string {
  if (!RAILWAY_PROJECT_ID) {
    throw new Error('RAILWAY_PROJECT_ID is not configured');
  }
  return RAILWAY_PROJECT_ID;
}

