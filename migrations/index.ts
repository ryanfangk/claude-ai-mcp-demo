import * as migration_20260603_213630_initial_admins_mcp_agents_products from './20260603_213630_initial_admins_mcp_agents_products';

export const migrations = [
  {
    up: migration_20260603_213630_initial_admins_mcp_agents_products.up,
    down: migration_20260603_213630_initial_admins_mcp_agents_products.down,
    name: '20260603_213630_initial_admins_mcp_agents_products'
  },
];
