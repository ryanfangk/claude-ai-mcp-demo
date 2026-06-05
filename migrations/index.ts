import * as migration_20260603_213630_initial_admins_mcp_agents_products from './20260603_213630_initial_admins_mcp_agents_products';
import * as migration_20260605_142502_users_purchases from './20260605_142502_users_purchases';

export const migrations = [
  {
    up: migration_20260603_213630_initial_admins_mcp_agents_products.up,
    down: migration_20260603_213630_initial_admins_mcp_agents_products.down,
    name: '20260603_213630_initial_admins_mcp_agents_products',
  },
  {
    up: migration_20260605_142502_users_purchases.up,
    down: migration_20260605_142502_users_purchases.down,
    name: '20260605_142502_users_purchases'
  },
];
